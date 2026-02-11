/*
UP: Fix issue status trigger to set resolution/closed timestamps
DOWN: Restore previous AFTER UPDATE trigger behavior
*/

-- UP
BEGIN;

-- Recreate trigger/function so NEW.date_resolved/date_closed are persisted
DROP TRIGGER IF EXISTS trigger_log_issue_status_change ON issues;
DROP FUNCTION IF EXISTS log_issue_status_change();

CREATE OR REPLACE FUNCTION log_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;

  -- Auto-set resolution date
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.date_resolved := NOW();
  END IF;

  -- Auto-set closed date
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.date_closed := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_issue_status_change
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION log_issue_status_change();

COMMIT;

-- DOWN
BEGIN;

DROP TRIGGER IF EXISTS trigger_log_issue_status_change ON issues;
DROP FUNCTION IF EXISTS log_issue_status_change();

CREATE OR REPLACE FUNCTION log_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;

  -- Auto-set resolution date (not persisted in AFTER trigger)
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.date_resolved := NOW();
  END IF;

  -- Auto-set closed date (not persisted in AFTER trigger)
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.date_closed := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_issue_status_change
  AFTER UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION log_issue_status_change();

COMMIT;
