import { NextResponse } from "next/server";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { getEditorialAssetById } from "@/lib/server/editorial/assets";
import { getEditorialV2AssetVariantById } from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

function buildContentDisposition(filename: string | null) {
  if (!filename) {
    return "inline";
  }

  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const [canonicalAsset, legacyAsset] = await Promise.all([
    getEditorialV2AssetVariantById(assetId),
    getEditorialAssetById(assetId),
  ]);
  const asset = canonicalAsset
    ? {
        r2Key: canonicalAsset.r2Key,
        mimeType: canonicalAsset.mimeType,
        originalFilename: canonicalAsset.originalFilename,
      }
    : legacyAsset;

  if (!asset) {
    return NextResponse.json(
      {
        ok: false,
        error: "editorial_asset_not_found",
      },
      { status: 404 },
    );
  }

  const env = await getEditorialEnv({
    requireQueue: false,
  });
  const object = await env.INTAKE_BUCKET.get(asset.r2Key);

  if (!object?.body) {
    return NextResponse.json(
      {
        ok: false,
        error: "editorial_asset_body_not_found",
      },
      { status: 404 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", asset.mimeType || "application/octet-stream");
  headers.set("Content-Disposition", buildContentDisposition(asset.originalFilename));
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

  return new NextResponse(object.body, {
    status: 200,
    headers,
  });
}
