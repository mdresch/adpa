-- Audit log with hash chaining (tamper-evident)
-- Requires pgcrypto

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_user_id UUID,
    ip INET,
    user_agent TEXT,
    request_id TEXT,
    table_name TEXT NOT NULL,
    row_id UUID,
    action TEXT NOT NULL, -- read, create, update, delete
    reason TEXT,
    old_values JSONB,
    new_values JSONB,
    prev_hash TEXT,
    hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_table_row ON audit_log(table_name, row_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, occurred_at DESC);

-- Before insert: set prev_hash and compute hash over previous hash + payload
CREATE OR REPLACE FUNCTION audit_log_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  last_hash TEXT;
  payload TEXT;
BEGIN
  SELECT hash INTO last_hash
  FROM audit_log
  WHERE table_name = NEW.table_name AND (NEW.row_id IS NULL OR row_id = NEW.row_id)
  ORDER BY occurred_at DESC
  LIMIT 1;

  NEW.prev_hash := last_hash;

  payload := COALESCE(NEW.table_name,'') || '|' || COALESCE(NEW.action,'') || '|' || COALESCE(NEW.row_id::text,'') || '|' ||
             COALESCE(NEW.actor_user_id::text,'') || '|' || COALESCE(NEW.reason,'') || '|' ||
             COALESCE(NEW.old_values::text,'') || '|' || COALESCE(NEW.new_values::text,'') || '|' || COALESCE(NEW.occurred_at::text,'') || '|' || COALESCE(NEW.prev_hash,'');

  NEW.hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_before_insert ON audit_log;
CREATE TRIGGER trg_audit_log_before_insert
BEFORE INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_before_insert();

-- Document table triggers
CREATE OR REPLACE FUNCTION audit_documents_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, row_id, action, new_values)
    VALUES ('documents', NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, row_id, action, old_values, new_values)
    VALUES ('documents', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, row_id, action, old_values)
    VALUES ('documents', OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_documents_changes ON documents;
CREATE TRIGGER trg_audit_documents_changes
AFTER INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION audit_documents_changes();


