import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialEnv } from "@/lib/server/editorial/env";

export const runtime = "nodejs";

function buildContentDisposition(filename: string | null) {
  if (!filename) {
    return "inline";
  }

  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const identity = await getAdminIdentity();

  if (!identity) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin_access_required",
      },
      { status: 401 },
    );
  }

  const { id, assetId } = await params;
  const env = await getEditorialEnv({
    requireQueue: false,
  });

  const asset = await env.EDITORIAL_DB.prepare(
    `SELECT
       proposal_id AS proposalId,
       r2_key AS r2Key,
       original_filename AS originalFilename,
       mime_type AS mimeType
     FROM proposal_asset
     WHERE id = ?
       AND proposal_id = ?
     LIMIT 1`,
  )
    .bind(assetId, id)
    .first<{
      proposalId: string;
      r2Key: string;
      originalFilename: string | null;
      mimeType: string;
    }>();

  if (!asset) {
    return NextResponse.json(
      {
        ok: false,
        error: "proposal_asset_not_found",
      },
      { status: 404 },
    );
  }

  const object = await env.INTAKE_BUCKET.get(asset.r2Key);

  if (!object?.body) {
    return NextResponse.json(
      {
        ok: false,
        error: "proposal_asset_body_not_found",
      },
      { status: 404 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", asset.mimeType || "application/octet-stream");
  headers.set("Content-Disposition", buildContentDisposition(asset.originalFilename));
  headers.set("Cache-Control", "private, max-age=300");

  return new NextResponse(object.body, {
    status: 200,
    headers,
  });
}
