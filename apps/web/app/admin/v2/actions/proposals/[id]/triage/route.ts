import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import {
  getAdminIdentity,
  proposalTriageSchema,
  updateProposalTriage,
} from "@/lib/server/editorial/admin";
import { ensureEditorialV2DraftForProposal } from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

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
    const input = proposalTriageSchema.parse(await request.json());
    const updated = await updateProposalTriage(id, input, identity, {
      skipDraftGeneration: true,
    });

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_found",
        },
        { status: 404 },
      );
    }

    if (
      updated.toStatus === "in_review" &&
      updated.draftGenerationState !== "failed"
    ) {
      try {
        await ensureEditorialV2DraftForProposal(id, identity.email);
      } catch (error) {
        updated.draftGenerationState = "failed";
        updated.draftGenerationError =
          error instanceof Error ? error.message : "editorial_v2_draft_generation_failed";
      }
    }

    return NextResponse.json({
      ok: true,
      ...updated,
      detail:
        updated.draftGenerationState === "failed"
          ? "상태는 바뀌었지만 원고실 초안 생성은 끝까지 이어지지 않았습니다. 검토실이나 원고실에서 다시 확인해 주세요."
          : undefined,
    });
  } catch (error) {
    console.error("Failed to triage v2 proposal", error);
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_triage_failed",
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "제안 상태를 바꾸지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
