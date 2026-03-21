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
    const coverImageUrl = family?.detail?.publicUrl ?? family?.master?.publicUrl ?? null;
    const draft =
      coverImageUrl
        ? await updateEditorialDraftCoverImage(id, coverImageUrl, identity.email)
        : null;

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
