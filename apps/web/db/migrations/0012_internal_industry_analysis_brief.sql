CREATE INDEX IF NOT EXISTS idx_feature_entry_source_type_updated_at
  ON feature_entry(source_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS internal_analysis_brief (
  id TEXT PRIMARY KEY,
  feature_entry_id TEXT NOT NULL UNIQUE,
  current_revision_id TEXT,
  working_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis_scope TEXT,
  why_now TEXT,
  market TEXT,
  core_entities_json TEXT NOT NULL DEFAULT '[]',
  source_links_json TEXT NOT NULL DEFAULT '[]',
  evidence_points_json TEXT NOT NULL DEFAULT '[]',
  editor_notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (feature_entry_id) REFERENCES feature_entry(id) ON DELETE CASCADE,
  FOREIGN KEY (current_revision_id) REFERENCES feature_revision(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_internal_analysis_brief_revision
  ON internal_analysis_brief(current_revision_id);

CREATE INDEX IF NOT EXISTS idx_internal_analysis_brief_updated_at
  ON internal_analysis_brief(updated_at DESC);
