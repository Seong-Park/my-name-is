BEGIN;
-- Not exposed through the Supabase Data API. Only the server database role uses this schema.
CREATE SCHEMA name_private;
REVOKE ALL ON SCHEMA name_private FROM PUBLIC;

CREATE TABLE name_private.name_ai_days (
  day date PRIMARY KEY,
  call_count bigint NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  success_count bigint NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count bigint NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_nano bigint NOT NULL DEFAULT 0 CHECK (cost_nano >= 0),
  reserved_nano bigint NOT NULL DEFAULT 0 CHECK (reserved_nano >= 0),
  ai_halted boolean NOT NULL DEFAULT false
);

CREATE TABLE name_private.name_ai_attempts (
  operation_id uuid PRIMARY KEY,
  analysis_id uuid NOT NULL,
  candidate_id varchar(43) NOT NULL,
  attempt smallint NOT NULL CHECK (attempt IN (0,1)),
  idempotency_key uuid NOT NULL UNIQUE,
  browser_mac varchar(43) NOT NULL,
  model text NOT NULL,
  pricing_version text NOT NULL,
  prompt_version text NOT NULL,
  day date NOT NULL REFERENCES name_private.name_ai_days(day),
  reserved_nano bigint NOT NULL CHECK (reserved_nano > 0),
  cost_nano bigint CHECK (cost_nano >= 0),
  input_tokens bigint CHECK (input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens >= 0),
  state text NOT NULL CHECK (state IN ('reserved','dispatching','succeeded','failed','uncertain')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dispatched_at timestamptz,
  settled_at timestamptz,
  provider_finished_at timestamptz,
  UNIQUE (analysis_id,candidate_id,attempt),
  CHECK (candidate_id ~ '^[A-Za-z0-9_-]{43}$'),
  CHECK (browser_mac ~ '^[A-Za-z0-9_-]{43}$'),
  CHECK ((state IN ('reserved','dispatching') AND cost_nano IS NULL AND settled_at IS NULL)
      OR (state IN ('succeeded','failed','uncertain') AND cost_nano IS NOT NULL AND settled_at IS NOT NULL)),
  CHECK (state NOT IN ('succeeded','failed') OR provider_finished_at IS NOT NULL)
);
CREATE INDEX name_ai_pending ON name_private.name_ai_attempts(state,created_at)
  WHERE state IN ('reserved','dispatching','uncertain');
REVOKE ALL ON ALL TABLES IN SCHEMA name_private FROM PUBLIC;
COMMIT;
