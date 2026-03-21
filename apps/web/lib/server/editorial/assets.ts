import "server-only";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { getEditorialAiConfig, getEditorialGeneratorSecret } from "@/lib/server/editorial/ai";

export const editorialImageSpec = {
  minWidth: 1600,
  minHeight: 1200,
  maxFileSizeBytes: 10 * 1024 * 1024,
  master: {
    role: "master",
    width: 1600,
    height: 1200,
  },
  card: {
    role: "card",
    width: 1200,
    height: 900,
  },
  detail: {
    role: "detail",
    width: 1600,
    height: 1000,
  },
} as const;

type EditorialAssetSourceType = "admin_upload" | "proposal_promoted";
type EditorialAssetRole = "master" | "card" | "detail";

type GeneratorVariant = {
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentBase64: string;
};

type EditorialAssetRow = {
  id: string;
  familyId: string;
  proposalId: string;
  sourceType: EditorialAssetSourceType;
  sourceProposalAssetId: string | null;
  role: EditorialAssetRole;
  variantKey: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalFilename: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type EditorialAssetFamily = {
  familyId: string;
  proposalId: string;
  sourceType: EditorialAssetSourceType;
  sourceProposalAssetId: string | null;
  originalFilename: string | null;
  createdBy: string | null;
  createdAt: string;
  master: EditorialAssetRow | null;
  card: EditorialAssetRow | null;
  detail: EditorialAssetRow | null;
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const imageVariantResponseSchema = z.object({
  ok: z.literal(true),
  image: z.object({
    master: z.object({
      mimeType: z.string().trim().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      sizeBytes: z.number().int().positive(),
      contentBase64: z.string().min(1),
    }),
    card: z.object({
      mimeType: z.string().trim().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      sizeBytes: z.number().int().positive(),
      contentBase64: z.string().min(1),
    }),
    detail: z.object({
      mimeType: z.string().trim().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      sizeBytes: z.number().int().positive(),
      contentBase64: z.string().min(1),
    }),
  }),
});

function ensureAllowedImageFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("editorial_image_type_invalid");
  }

  if (file.size <= 0 || file.size > editorialImageSpec.maxFileSizeBytes) {
    throw new Error("editorial_image_size_invalid");
  }
}

function buildVariantKey(role: EditorialAssetRole) {
  switch (role) {
    case "master":
      return "master-1600x1200";
    case "card":
      return "card-1200x900";
    case "detail":
      return "detail-1600x1000";
  }
}

function buildEditorialAssetPublicUrl(assetId: string) {
  return `/api/editorial/assets/${assetId}`;
}

function groupEditorialAssetRows(rows: EditorialAssetRow[]) {
  const families = new Map<string, EditorialAssetFamily>();

  for (const row of rows) {
    const current = families.get(row.familyId) ?? {
      familyId: row.familyId,
      proposalId: row.proposalId,
      sourceType: row.sourceType,
      sourceProposalAssetId: row.sourceProposalAssetId,
      originalFilename: row.originalFilename,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      master: null,
      card: null,
      detail: null,
    };

    current[row.role] = row;
    families.set(row.familyId, current);
  }

  return Array.from(families.values()).sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function listEditorialAssetRowsForProposal(proposalId: string) {
  const env = await getEditorialEnv({
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       family_id AS familyId,
       proposal_id AS proposalId,
       source_type AS sourceType,
       source_proposal_asset_id AS sourceProposalAssetId,
       role,
       variant_key AS variantKey,
       public_url AS publicUrl,
       mime_type AS mimeType,
       width,
       height,
       size_bytes AS sizeBytes,
       original_filename AS originalFilename,
       created_by AS createdBy,
       created_at AS createdAt
     FROM editorial_asset
     WHERE proposal_id = ?
     ORDER BY created_at DESC, role ASC`,
  )
    .bind(proposalId)
    .all<EditorialAssetRow>();

  return result.results ?? [];
}

export async function listEditorialAssetFamilies(proposalId: string) {
  const rows = await listEditorialAssetRowsForProposal(proposalId);
  return groupEditorialAssetRows(rows);
}

async function getEditorialAssetRowsByFamilyId(familyId: string) {
  const env = await getEditorialEnv({
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       family_id AS familyId,
       proposal_id AS proposalId,
       source_type AS sourceType,
       source_proposal_asset_id AS sourceProposalAssetId,
       role,
       variant_key AS variantKey,
       public_url AS publicUrl,
       mime_type AS mimeType,
       width,
       height,
       size_bytes AS sizeBytes,
       original_filename AS originalFilename,
       created_by AS createdBy,
       created_at AS createdAt
     FROM editorial_asset
     WHERE family_id = ?
     ORDER BY created_at DESC, role ASC`,
  )
    .bind(familyId)
    .all<EditorialAssetRow>();

  return result.results ?? [];
}

async function requestEditorialImageVariants(input: {
  filename: string;
  mimeType: string;
  fileBuffer: ArrayBuffer;
}) {
  const config = await getEditorialAiConfig();
  const generatorUrl = config.generatorUrl?.replace(/\/$/, "");
  const generatorSecret = await getEditorialGeneratorSecret();

  if (!generatorUrl || !generatorSecret) {
    throw new Error("editorial_image_generator_not_configured");
  }

  const response = await fetch(`${generatorUrl}/v1/editorial/image-variants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${generatorSecret}`,
    },
    body: JSON.stringify({
      filename: input.filename,
      mimeType: input.mimeType,
      contentBase64: Buffer.from(input.fileBuffer).toString("base64"),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`editorial_image_generator_failed (${response.status}): ${errorBody}`);
  }

  const payload = imageVariantResponseSchema.parse(await response.json());
  return payload.image;
}

async function storeEditorialAssetFamily(input: {
  proposalId: string;
  originalFilename: string;
  createdBy: string;
  sourceType: EditorialAssetSourceType;
  sourceProposalAssetId?: string | null;
  variants: {
    master: GeneratorVariant;
    card: GeneratorVariant;
    detail: GeneratorVariant;
  };
}) {
  const env = await getEditorialEnv({
    requireQueue: false,
  });
  const familyId = crypto.randomUUID();
  const now = new Date().toISOString();
  const rows: EditorialAssetRow[] = [];

  for (const [role, variant] of Object.entries(input.variants) as Array<
    [EditorialAssetRole, GeneratorVariant]
  >) {
    const assetId = crypto.randomUUID();
    const r2Key = `editorial/${input.proposalId}/${familyId}/${role}.jpg`;
    const body = Buffer.from(variant.contentBase64, "base64");

    try {
      await env.INTAKE_BUCKET.put(r2Key, body, {
        httpMetadata: {
          contentType: variant.mimeType,
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown_r2_error";
      throw new Error(`editorial_asset_variant_store_failed (${role}): ${detail}`);
    }

    rows.push({
      id: assetId,
      familyId,
      proposalId: input.proposalId,
      sourceType: input.sourceType,
      sourceProposalAssetId: input.sourceProposalAssetId ?? null,
      role,
      variantKey: buildVariantKey(role),
      publicUrl: buildEditorialAssetPublicUrl(assetId),
      mimeType: variant.mimeType,
      width: variant.width,
      height: variant.height,
      sizeBytes: body.byteLength,
      originalFilename: input.originalFilename,
      createdBy: input.createdBy,
      createdAt: now,
    });
  }

  try {
    await env.EDITORIAL_DB.batch(
      rows.map((row) =>
        env.EDITORIAL_DB.prepare(
          `INSERT INTO editorial_asset (
             id,
             family_id,
             proposal_id,
             source_type,
             source_proposal_asset_id,
             role,
             variant_key,
             r2_key,
             public_url,
             original_filename,
             mime_type,
             width,
             height,
             size_bytes,
             created_by,
             created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          row.id,
          row.familyId,
          row.proposalId,
          row.sourceType,
          row.sourceProposalAssetId,
          row.role,
          row.variantKey,
          `editorial/${input.proposalId}/${familyId}/${row.role}.jpg`,
          row.publicUrl,
          row.originalFilename,
          row.mimeType,
          row.width,
          row.height,
          row.sizeBytes,
          row.createdBy,
          row.createdAt,
        ),
      ),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_db_error";
    throw new Error(`editorial_asset_family_store_failed: ${detail}`);
  }

  const storedRows = await getEditorialAssetRowsByFamilyId(familyId);

  if (storedRows.length < 3) {
    throw new Error(
      `editorial_asset_family_store_failed: persisted_rows=${storedRows.length}`,
    );
  }

  return groupEditorialAssetRows(storedRows)[0] ?? null;
}

export async function uploadEditorialImageForProposal(
  proposalId: string,
  file: File,
  editorEmail: string,
) {
  ensureAllowedImageFile(file);
  const variants = await requestEditorialImageVariants({
    filename: file.name,
    mimeType: file.type,
    fileBuffer: await file.arrayBuffer(),
  });

  return storeEditorialAssetFamily({
    proposalId,
    originalFilename: file.name,
    createdBy: editorEmail,
    sourceType: "admin_upload",
    variants,
  });
}

export async function promoteProposalAssetForProposal(
  proposalId: string,
  proposalAssetId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireQueue: false,
  });

  const existingFamilyId = await env.EDITORIAL_DB.prepare(
    `SELECT family_id AS familyId
     FROM editorial_asset
     WHERE proposal_id = ?
       AND source_type = 'proposal_promoted'
       AND source_proposal_asset_id = ?
     LIMIT 1`,
  )
    .bind(proposalId, proposalAssetId)
    .first<{ familyId: string }>();

  if (existingFamilyId?.familyId) {
    const existingRows = await getEditorialAssetRowsByFamilyId(existingFamilyId.familyId);
    return groupEditorialAssetRows(existingRows)[0] ?? null;
  }

  const sourceAsset = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       r2_key AS r2Key,
       original_filename AS originalFilename,
       mime_type AS mimeType
     FROM proposal_asset
     WHERE proposal_id = ?
       AND id = ?
     LIMIT 1`,
  )
    .bind(proposalId, proposalAssetId)
    .first<{
      id: string;
      r2Key: string;
      originalFilename: string | null;
      mimeType: string;
    }>();

  if (!sourceAsset) {
    throw new Error("proposal_asset_not_found");
  }

  if (!allowedMimeTypes.has(sourceAsset.mimeType)) {
    throw new Error("proposal_asset_not_image");
  }

  const object = await env.INTAKE_BUCKET.get(sourceAsset.r2Key);

  if (!object) {
    throw new Error("proposal_asset_body_not_found");
  }

  const variants = await requestEditorialImageVariants({
    filename: sourceAsset.originalFilename ?? "proposal-image",
    mimeType: sourceAsset.mimeType,
    fileBuffer: await object.arrayBuffer(),
  });

  return storeEditorialAssetFamily({
    proposalId,
    originalFilename: sourceAsset.originalFilename ?? "proposal-image",
    createdBy: editorEmail,
    sourceType: "proposal_promoted",
    sourceProposalAssetId: sourceAsset.id,
    variants,
  });
}

export async function getEditorialAssetById(assetId: string) {
  const env = await getEditorialEnv({
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       family_id AS familyId,
       proposal_id AS proposalId,
       source_type AS sourceType,
       source_proposal_asset_id AS sourceProposalAssetId,
       role,
       variant_key AS variantKey,
       r2_key AS r2Key,
       public_url AS publicUrl,
       original_filename AS originalFilename,
       mime_type AS mimeType,
       width,
       height,
       size_bytes AS sizeBytes,
       created_by AS createdBy,
       created_at AS createdAt
     FROM editorial_asset
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(assetId)
    .first<
      EditorialAssetRow & {
        r2Key: string;
      }
    >();

  return row ?? null;
}
