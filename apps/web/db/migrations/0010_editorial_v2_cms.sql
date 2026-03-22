PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS feature_entry (
  id TEXT PRIMARY KEY,
  legacy_article_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'proposal_intake',
  current_published_revision_id TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_feature_entry_slug
  ON feature_entry(slug);

CREATE INDEX IF NOT EXISTS idx_feature_entry_archived_at
  ON feature_entry(archived_at);

CREATE TABLE IF NOT EXISTS feature_revision (
  id TEXT PRIMARY KEY,
  feature_entry_id TEXT NOT NULL,
  proposal_id TEXT,
  status TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  display_title_lines_json TEXT,
  dek TEXT NOT NULL,
  verdict TEXT NOT NULL,
  category_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  tag_ids_json TEXT NOT NULL DEFAULT '[]',
  cover_asset_family_id TEXT,
  body_markdown TEXT NOT NULL,
  body_sections_json TEXT NOT NULL DEFAULT '[]',
  visibility_metadata_json TEXT,
  citations_json TEXT NOT NULL DEFAULT '[]',
  entity_map_json TEXT NOT NULL DEFAULT '[]',
  editor_notes TEXT,
  source_snapshot_hash TEXT,
  published_at TEXT,
  scheduled_for TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (feature_entry_id) REFERENCES feature_entry(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_revision_number
  ON feature_revision(feature_entry_id, revision_number);

CREATE INDEX IF NOT EXISTS idx_feature_revision_status
  ON feature_revision(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_revision_proposal_id
  ON feature_revision(proposal_id);

CREATE TABLE IF NOT EXISTS asset_family (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  feature_entry_id TEXT,
  feature_revision_id TEXT,
  source_type TEXT NOT NULL,
  source_proposal_asset_id TEXT,
  original_filename TEXT,
  original_mime_type TEXT NOT NULL,
  crop_status TEXT NOT NULL DEFAULT 'ready',
  focus_x REAL,
  focus_y REAL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE SET NULL,
  FOREIGN KEY (feature_entry_id) REFERENCES feature_entry(id) ON DELETE SET NULL,
  FOREIGN KEY (feature_revision_id) REFERENCES feature_revision(id) ON DELETE SET NULL,
  FOREIGN KEY (source_proposal_asset_id) REFERENCES proposal_asset(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_family_proposal_id
  ON asset_family(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_family_feature_revision_id
  ON asset_family(feature_revision_id, created_at DESC);

CREATE TABLE IF NOT EXISTS asset_variant (
  id TEXT PRIMARY KEY,
  asset_family_id TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (asset_family_id) REFERENCES asset_family(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_variant_family_key
  ON asset_variant(asset_family_id, variant_key);

CREATE TABLE IF NOT EXISTS draft_generation_run (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  feature_revision_id TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  model TEXT,
  response_id TEXT,
  latency_ms INTEGER,
  error_message TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE SET NULL,
  FOREIGN KEY (feature_revision_id) REFERENCES feature_revision(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_draft_generation_run_revision
  ON draft_generation_run(feature_revision_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_draft_generation_run_status
  ON draft_generation_run(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS publish_event (
  id TEXT PRIMARY KEY,
  feature_entry_id TEXT NOT NULL,
  feature_revision_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_email TEXT,
  note TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (feature_entry_id) REFERENCES feature_entry(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_revision_id) REFERENCES feature_revision(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_publish_event_entry
  ON publish_event(feature_entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revision_note (
  id TEXT PRIMARY KEY,
  feature_revision_id TEXT NOT NULL,
  author_email TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (feature_revision_id) REFERENCES feature_revision(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revision_note_revision
  ON revision_note(feature_revision_id, created_at DESC);
