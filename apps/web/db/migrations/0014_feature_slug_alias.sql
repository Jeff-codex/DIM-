CREATE TABLE IF NOT EXISTS feature_slug_alias (
  alias_slug TEXT PRIMARY KEY,
  feature_entry_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retired_at TEXT,
  FOREIGN KEY (feature_entry_id) REFERENCES feature_entry(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_slug_alias_feature_entry
  ON feature_slug_alias(feature_entry_id);
