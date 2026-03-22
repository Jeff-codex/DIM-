import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { setEditorialV2CoverAssetFamily } from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

const requestSchema = z.object({
  assetFamilyId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
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

  const { proposalId } = await params;
  const body = requestSchema.parse(await request.json());
  const draft = await setEditorialV2CoverAssetFamily(
    proposalId,
    body.assetFamilyId,
    identity.email,
  );

  if (!draft) {
    return NextResponse.json(
      {
        ok: false,
        error: "feature_revision_not_found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    draft,
  });
}
