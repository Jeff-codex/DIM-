-- DIM Internal Editorial System
-- D1 schema draft
-- Current goal:
-- proposal intake, normalization, AI enrichment, editorial drafting, publication snapshot

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS editor_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'intake_editor',
      'subject_editor',
      'fact_checker',
      'seo_reviewer',
      'managing_editor',
      'publisher_admin'
    )
  ),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposal (
  id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'public_submit',
  status TEXT NOT NULL CHECK (
    status IN (
      'received',
      'normalized',
      'triaged',
      'needs_info',
      'assigned',
      'in_review',
      'fact_check',
      'seo_aeo_review',
      'approved',
      'in_edit',
      'scheduled',
      'published',
      'rejected',
      'expired',
      'archived'
    )
  ),
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
  link_type TEXT NOT NULL CHECK (
    link_type IN (
      'official',
      'product',
      'pricing',
      'reference',
      'media',
      'social',
      'other'
    )
  ),
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
  kind TEXT NOT NULL CHECK (
    kind IN (
      'image',
      'pdf',
      'document',
      'spreadsheet',
      'archive',
      'other'
    )
  ),
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

CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (
    type IN (
      'company',
      'product',
      'service',
      'person',
      'launch',
      'market',
      'topic',
      'competitor'
    )
  ),
  canonical_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  official_url TEXT,
  description TEXT,
  normalized_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_type_name ON entity(type, canonical_name);

CREATE TABLE IF NOT EXISTS entity_alias (
  entity_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (entity_id, alias),
  FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_entity (
  proposal_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_field TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (proposal_id, entity_id),
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entity(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proposal_entity_primary ON proposal_entity(proposal_id, is_primary);

CREATE TABLE IF NOT EXISTS editorial_assessment (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL UNIQUE,
  intake_editor_id TEXT,
  fit_score INTEGER NOT NULL DEFAULT 0,
  urgency_score INTEGER NOT NULL DEFAULT 0,
  evidence_score INTEGER NOT NULL DEFAULT 0,
  recommended_output_type TEXT CHECK (
    recommended_output_type IN (
      'analysis_feature',
      'launch_feature',
      'comparison_feature',
      'short_brief'
    )
  ),
  recommended_category_id TEXT,
  decision_status TEXT NOT NULL CHECK (
    decision_status IN (
      'pending',
      'needs_info',
      'assigned',
      'rejected'
    )
  ),
  decision_reason TEXT,
  notes_markdown TEXT,
  assessed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
  FOREIGN KEY (intake_editor_id) REFERENCES editor_user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS editorial_draft (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  owner_editor_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'needs_review',
      'fact_check',
      'seo_review',
      'approved',
      'scheduled',
      'published',
      'archived'
    )
  ),
  angle TEXT,
  output_type TEXT CHECK (
    output_type IN (
      'analysis_feature',
      'launch_feature',
      'comparison_feature',
      'short_brief'
    )
  ),
  category_id TEXT,
  slug_candidate TEXT,
  title TEXT,
  dek TEXT,
  interpretive_frame TEXT,
  answer_block TEXT,
  evidence_block TEXT,
  body_markdown TEXT,
  seo_title TEXT,
  seo_description TEXT,
  og_image_asset_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_editor_id) REFERENCES editor_user(id) ON DELETE SET NULL,
  FOREIGN KEY (og_image_asset_id) REFERENCES proposal_asset(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_editorial_draft_proposal_id ON editorial_draft(proposal_id);
CREATE INDEX IF NOT EXISTS idx_editorial_draft_status ON editorial_draft(status);

CREATE TABLE IF NOT EXISTS editorial_version (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  editor_id TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES editorial_draft(id) ON DELETE CASCADE,
  FOREIGN KEY (editor_id) REFERENCES editor_user(id) ON DELETE SET NULL,
  UNIQUE (draft_id, version_number)
);

CREATE TABLE IF NOT EXISTS ai_job (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  draft_id TEXT,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'normalize',
      'entity_extract',
      'classify',
      'outline',
      'draft_generate',
      'title_candidates',
      'seo_package',
      'fact_gap_detect'
    )
  ),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  input_ref TEXT,
  output_ref TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (proposal_id) REFERENCES proposal(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES editorial_draft(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_job_status_task ON ai_job(status, task_type);

CREATE TABLE IF NOT EXISTS ai_artifact (
  id TEXT PRIMARY KEY,
  ai_job_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL CHECK (
    artifact_type IN (
      'normalized_fields',
      'entity_candidates',
      'classification',
      'outline',
      'title_candidates',
      'draft',
      'seo_package',
      'fact_gaps'
    )
  ),
  content_json TEXT NOT NULL,
  score REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ai_job_id) REFERENCES ai_job(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publication (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'scheduled',
      'published',
      'unpublished',
      'archived'
    )
  ),
  public_slug TEXT NOT NULL UNIQUE,
  canonical_url TEXT NOT NULL UNIQUE,
  snapshot_r2_key TEXT,
  version_hash TEXT,
  published_by TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES editorial_draft(id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES editor_user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publication_asset (
  publication_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (
    purpose IN (
      'cover',
      'open_graph',
      'body',
      'social'
    )
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (publication_id, asset_id, purpose),
  FOREIGN KEY (publication_id) REFERENCES publication(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES proposal_asset(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_event (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (
    subject_type IN (
      'proposal',
      'draft',
      'publication',
      'ai_job'
    )
  ),
  subject_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  actor_type TEXT NOT NULL CHECK (
    actor_type IN (
      'system',
      'submitter',
      'editor'
    )
  ),
  actor_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_event_subject ON workflow_event(subject_type, subject_id, created_at DESC);
