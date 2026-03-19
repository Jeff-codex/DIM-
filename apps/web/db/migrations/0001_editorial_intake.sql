PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS proposal (
  id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'public_submit',
  status TEXT NOT NULL,
  project_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  website_url TEXT,
  summary TEXT,
  product_description TEXT,
  why_now TEXT,
  stage TEXT,
  market TEXT,
  raw_payload_json TEXT NOT NULL,
  completeness_score INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT,
  locale TEXT NOT NULL DEFAULT 'ko-KR',
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposal_status ON proposal(status);
CREATE INDEX IF NOT EXISTS idx_proposal_project_name ON proposal(project_name);
CREATE INDEX IF NOT EXISTS idx_proposal_submitted_at ON proposal(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_dedupe_key ON proposal(dedupe_key);

CREATE TABLE IF NOT EXISTS proposal_link (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  link_type TEXT NOT NULL,
  http_status INTEGER,
  captured_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proposal_link_proposal_id ON proposal_link(proposal_id);

CREATE TABLE IF NOT EXISTS proposal_asset (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  kind TEXT NOT NULL,
  size_bytes INTEGER,
  checksum TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  source_url TEXT,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proposal_asset_proposal_id ON proposal_asset(proposal_id);

CREATE TABLE IF NOT EXISTS proposal_draft (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ko-KR',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposal_draft_updated_at ON proposal_draft(updated_at DESC);

CREATE TABLE IF NOT EXISTS workflow_event (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_event_subject ON workflow_event(subject_type, subject_id, created_at DESC);
