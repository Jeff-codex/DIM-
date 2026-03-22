import { NextResponse } from "next/server";
import { z } from "zod";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { promoteProposalAssetToEditorialV2 } from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

const requestSchema = z.object({
  proposalAssetId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  try {
    const { id } = await params;
    const body = requestSchema.parse(await request.json());
    const result = await promoteProposalAssetToEditorialV2(
      id,
      body.proposalAssetId,
      identity.email,
    );

    return NextResponse.json({
      ok: true,
      family: result.family,
      draft: result.draft,
    });
  } catch (error) {
    console.error("Failed to promote v2 proposal asset", error);
    const rawDetail =
      error instanceof Error ? error.message : "editorial_asset_promote_failed";

    return NextResponse.json(
      {
        ok: false,
        error: rawDetail,
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "원본 이미지를 편집용 자산으로 준비하지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
