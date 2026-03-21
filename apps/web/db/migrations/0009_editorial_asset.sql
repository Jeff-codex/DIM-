PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS editorial_asset (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  draft_id TEXT,
  source_type TEXT NOT NULL,
  source_proposal_asset_id TEXT,
  role TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES editorial_draft(id) ON DELETE SET NULL,
  FOREIGN KEY (source_proposal_asset_id) REFERENCES proposal_asset(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_editorial_asset_proposal_id
  ON editorial_asset(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_asset_family_id
  ON editorial_asset(family_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_editorial_asset_source_proposal_asset_id
  ON editorial_asset(source_proposal_asset_id);
