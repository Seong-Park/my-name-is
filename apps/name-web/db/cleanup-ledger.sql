-- Run inside a transaction holding pg_advisory_xact_lock(716240101).
-- $1 is the operator's current timestamptz, never a future cutoff.
WITH removed AS (
  DELETE FROM name_private.name_ai_attempts
  WHERE state IN ('succeeded','failed')
    AND provider_finished_at IS NOT NULL
    AND settled_at < $1::timestamptz - interval '7 days'
  RETURNING operation_id
)
SELECT count(*)::int AS removed_attempts FROM removed;
