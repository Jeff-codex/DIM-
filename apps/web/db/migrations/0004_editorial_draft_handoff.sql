ALTER TABLE editorial_draft
  ADD COLUMN draft_generated_at TEXT;

ALTER TABLE editorial_draft
  ADD COLUMN source_proposal_updated_at TEXT;

ALTER TABLE editorial_draft
  ADD COLUMN source_snapshot_json TEXT;

UPDATE editorial_draft
SET
  draft_generated_at = COALESCE(draft_generated_at, created_at),
  source_proposal_updated_at = COALESCE(
    source_proposal_updated_at,
    (
      SELECT updated_at
      FROM proposal
      WHERE proposal.id = editorial_draft.proposal_id
    )
  ),
  source_snapshot_json = COALESCE(
    source_snapshot_json,
    (
      SELECT json_object(
        'projectName', proposal.project_name,
        'summary', proposal.summary,
        'productDescription', proposal.product_description,
        'whyNow', proposal.why_now,
        'stage', proposal.stage,
        'market', proposal.market,
        'updatedAt', proposal.updated_at
      )
      FROM proposal
      WHERE proposal.id = editorial_draft.proposal_id
    )
  );
