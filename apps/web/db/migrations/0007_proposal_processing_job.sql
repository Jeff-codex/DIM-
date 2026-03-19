CREATE TABLE IF NOT EXISTS proposal_processing_job (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(proposal_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_proposal_processing_job_status
  ON proposal_processing_job(status, updated_at DESC);
