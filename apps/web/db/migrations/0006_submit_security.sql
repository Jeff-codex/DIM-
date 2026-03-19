CREATE TABLE IF NOT EXISTS proposal_rate_limit (
  bucket_key TEXT PRIMARY KEY,
  subject_hash TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposal_rate_limit_subject
  ON proposal_rate_limit(subject_hash, window_started_at DESC);
