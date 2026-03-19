CREATE TABLE IF NOT EXISTS publication_snapshot (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  article_slug TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT NOT NULL,
  display_title_lines_json TEXT,
  excerpt TEXT NOT NULL,
  interpretive_frame TEXT NOT NULL,
  category_id TEXT NOT NULL,
  cover_image_url TEXT,
  body_markdown TEXT NOT NULL,
  metadata_json TEXT,
  source_proposal_updated_at TEXT,
  source_draft_updated_at TEXT,
  prepared_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_publication_snapshot_proposal
  ON publication_snapshot (proposal_id);

CREATE INDEX IF NOT EXISTS idx_publication_snapshot_slug
  ON publication_snapshot (article_slug);
