import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { promoteProposalAssetForProposal } from "@/lib/server/editorial/assets";
import { updateEditorialDraftCoverImage } from "@/lib/server/editorial/draft";

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
    const family = await promoteProposalAssetForProposal(
      id,
      body.proposalAssetId,
      identity.email,
    );

    if (!family?.master) {
      throw new Error("editorial_asset_family_store_failed");
    }

    const coverImageUrl = family?.detail?.publicUrl ?? family?.master?.publicUrl ?? null;
    const draft =
      coverImageUrl
        ? await updateEditorialDraftCoverImage(id, coverImageUrl, identity.email)
        : null;

    if (coverImageUrl && !draft) {
      throw new Error("editorial_draft_cover_apply_failed");
    }

    return NextResponse.json({
      ok: true,
      family,
      draft,
    });
  } catch (error) {
    console.error("Failed to promote proposal asset", error);

    const message =
      error instanceof Error ? error.message : "editorial_asset_promote_failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
