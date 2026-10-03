-- Run after cleanup-ledger.sql in the same locked transaction.
-- Keep the whole month for 90 days after its end, plus any referenced day.
WITH removed AS (
  DELETE FROM name_private.name_ai_days d
  WHERE (date_trunc('month',d.day::timestamp) + interval '1 month')::date + 90
      <= ($1::timestamptz AT TIME ZONE 'Asia/Seoul')::date
    AND NOT EXISTS (SELECT 1 FROM name_private.name_ai_attempts a WHERE a.day=d.day)
  RETURNING day
)
SELECT count(*)::int AS removed_days FROM removed;
