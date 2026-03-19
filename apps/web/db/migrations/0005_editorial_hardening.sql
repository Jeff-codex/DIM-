CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_dedupe_key_unique
  ON proposal(dedupe_key);
