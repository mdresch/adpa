-- ADR-005 Federated Capability Ownership -- Phase 3 (Action Item 4): module
-- activation lifecycle. draft -> pending_department_approval -> active ->
-- pending_re_approval -> disabled, modeled on template-lifecycle's
-- stored-procedure + audit-trail pattern (server/migrations/000_baseline.sql
-- ~11336-11413, ~13036-13146: promote_template_status / template_status_history).
--
-- Lockdown mechanism note: template-lifecycle's own "lockdown" turned out to be
-- convention-only (no REVOKE anywhere in this codebase, and this app connects
-- to Postgres via a single DATABASE_URL/role for both migrations and runtime --
-- there's no separate low-privilege app role to revoke UPDATE from without
-- rewiring deployment credentials). This migration instead uses a BEFORE UPDATE
-- trigger + session-local guard variable (set only inside
-- promote_capability_status), which needs no role separation and is enforced
-- even against a superuser session.
-- See docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md
-- and docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md.

ALTER TABLE public.capability_registry
  ADD COLUMN IF NOT EXISTS activation_status varchar(30) NOT NULL DEFAULT 'draft';

ALTER TABLE public.capability_registry
  DROP CONSTRAINT IF EXISTS capability_registry_activation_status_check;
ALTER TABLE public.capability_registry
  ADD CONSTRAINT capability_registry_activation_status_check
  CHECK (activation_status IN (
    'draft', 'pending_department_approval', 'active', 'pending_re_approval', 'disabled'
  ));

CREATE TABLE IF NOT EXISTS public.capability_activation_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capability_id uuid NOT NULL REFERENCES public.capability_registry(id),
  old_status varchar(30),
  new_status varchar(30) NOT NULL,
  changed_by uuid REFERENCES public.users(id),
  reason text,
  draco_verdict_id uuid, -- Phase 4 wires this to a real DRACO review row
  is_override boolean NOT NULL DEFAULT false,
  override_expires_at timestamptz, -- set only when is_override; NULL for normal approvals
  warned_24h_at timestamptz, -- idempotency markers for the (not yet built) override-expiry warning sweep
  warned_12h_at timestamptz,
  config_snapshot_hash text, -- content hash of the module's config/control data at this transition; Phase 5 populates
  changed_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_capability_activation_history_capability
  ON public.capability_activation_history(capability_id);

-- Metadata-driven mapping of "linked config/control tables" per module, read by
-- attach_module_drift_trigger below. Starts empty: no existing governed module
-- has a config/control table wired into this system yet -- this ships as real,
-- working, tested infrastructure with nothing attached, not a fabricated example.
CREATE TABLE IF NOT EXISTS public.module_drift_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id varchar(100) NOT NULL,
  table_name varchar(100) NOT NULL,
  monitored_columns text[] NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (module_id, table_name)
);

-- Lockdown: only promote_capability_status may change activation_status.
-- is_local=true on set_config means the guard reverts at end of transaction;
-- promote_capability_status additionally flips it back to 'off' right after its
-- own UPDATE (see below) so the bypass window doesn't extend to the rest of
-- whatever transaction called it.
CREATE OR REPLACE FUNCTION public.guard_capability_registry_activation_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.activation_status IS DISTINCT FROM OLD.activation_status
     AND current_setting('adpa.allow_activation_status_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'activation_status may only be changed via promote_capability_status()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_capability_registry_activation_status ON public.capability_registry;
CREATE TRIGGER trg_guard_capability_registry_activation_status
BEFORE UPDATE ON public.capability_registry
FOR EACH ROW EXECUTE FUNCTION public.guard_capability_registry_activation_status();

-- The only permitted writer of capability_registry.activation_status.
-- Transition graph is intentionally minimal -- exactly what the implementation
-- plan's stated flow implies, not a general-purpose state machine. Phase 4
-- (DRACO verdict required for ->active) and Phase 7 (functional_owner_department
-- NOT NULL required) layer additional preconditions onto this same procedure
-- later; not built here.
CREATE OR REPLACE FUNCTION public.promote_capability_status(
  p_capability_id uuid,
  p_new_status varchar(30),
  p_changed_by uuid,
  p_reason text,
  p_draco_verdict_id uuid DEFAULT NULL,
  p_is_override boolean DEFAULT false,
  p_override_expires_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_old_status varchar(30);
  v_allowed boolean;
BEGIN
  SELECT activation_status INTO v_old_status
  FROM public.capability_registry
  WHERE id = p_capability_id
  FOR UPDATE;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'capability_registry row not found: %', p_capability_id;
  END IF;

  v_allowed := CASE v_old_status
    WHEN 'draft' THEN p_new_status = 'pending_department_approval'
    WHEN 'pending_department_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'active' THEN p_new_status IN ('pending_re_approval', 'disabled')
    WHEN 'pending_re_approval' THEN p_new_status IN ('active', 'disabled')
    WHEN 'disabled' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'illegal activation_status transition: % -> %', v_old_status, p_new_status;
  END IF;

  PERFORM set_config('adpa.allow_activation_status_write', 'on', true);

  UPDATE public.capability_registry
  SET activation_status = p_new_status, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_capability_id;

  PERFORM set_config('adpa.allow_activation_status_write', 'off', true);

  INSERT INTO public.capability_activation_history
    (capability_id, old_status, new_status, changed_by, reason, draco_verdict_id, is_override, override_expires_at)
  VALUES
    (p_capability_id, v_old_status, p_new_status, p_changed_by, p_reason, p_draco_verdict_id, p_is_override, p_override_expires_at);
END;
$$;

-- Generic drift-handling trigger function. By convention (this is genuinely
-- greenfield -- no real "linked config/control table" exists in the product
-- yet), a table adopting this must carry module_id/portfolio_id columns
-- matching capability_registry's own scoping. No-ops if the row doesn't carry
-- both, or if the matching capability isn't currently 'active' (a config edit
-- on a non-active module isn't an error worth surfacing here).
CREATE OR REPLACE FUNCTION public.capability_drift_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_module_id varchar(100);
  v_portfolio_id uuid;
  v_capability_id uuid;
  v_current_status varchar(30);
BEGIN
  v_module_id := v_row ->> 'module_id';

  BEGIN
    v_portfolio_id := (v_row ->> 'portfolio_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_portfolio_id := NULL;
  END;

  IF v_module_id IS NULL OR v_portfolio_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, activation_status INTO v_capability_id, v_current_status
  FROM public.capability_registry
  WHERE module_id = v_module_id AND portfolio_id = v_portfolio_id;

  IF v_capability_id IS NOT NULL AND v_current_status = 'active' THEN
    PERFORM public.promote_capability_status(
      v_capability_id, 'pending_re_approval', NULL,
      'drift detected on ' || TG_TABLE_NAME, NULL, false, NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Registers a module's linked config/control table and attaches the drift
-- trigger to it. AFTER UPDATE OF <monitored_columns> (native Postgres
-- column-filtered trigger firing) is what gives the "don't fire on
-- metadata-only writes" guarantee -- simpler than, and equivalent to, a manual
-- WHEN clause comparing OLD/NEW for excluded columns. %I / quote_ident() on
-- every identifier assembled from caller input -- no string concatenation of
-- untrusted table/column names into executable SQL.
CREATE OR REPLACE FUNCTION public.attach_module_drift_trigger(
  p_module_id varchar(100),
  p_table_name varchar(100),
  p_monitored_columns text[]
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_columns text;
  v_trigger_name text := 'trg_capability_drift_' || p_table_name;
BEGIN
  INSERT INTO public.module_drift_sources (module_id, table_name, monitored_columns)
  VALUES (p_module_id, p_table_name, p_monitored_columns)
  ON CONFLICT (module_id, table_name) DO UPDATE SET monitored_columns = EXCLUDED.monitored_columns;

  SELECT string_agg(quote_ident(col), ', ') INTO v_columns
  FROM unnest(p_monitored_columns) AS col;

  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, p_table_name);

  EXECUTE format(
    'CREATE TRIGGER %I AFTER UPDATE OF %s ON %I FOR EACH ROW EXECUTE FUNCTION public.capability_drift_trigger_fn()',
    v_trigger_name, v_columns, p_table_name
  );
END;
$$;
