import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { promoteProposalAssetForProposal } from "@/lib/server/editorial/assets";

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

    return NextResponse.json({
      ok: true,
      family,
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
