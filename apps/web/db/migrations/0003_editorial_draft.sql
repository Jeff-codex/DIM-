CREATE TABLE IF NOT EXISTS editorial_draft (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  display_title_lines_json TEXT,
  excerpt TEXT NOT NULL,
  interpretive_frame TEXT NOT NULL,
  category_id TEXT NOT NULL,
  cover_image_url TEXT,
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  editor_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_editorial_draft_proposal_id
  ON editorial_draft(proposal_id);

CREATE INDEX IF NOT EXISTS idx_editorial_draft_updated_at
  ON editorial_draft(updated_at DESC);
