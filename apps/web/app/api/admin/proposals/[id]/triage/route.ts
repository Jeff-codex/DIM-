import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import {
  getAdminIdentity,
  proposalTriageSchema,
  updateProposalTriage,
} from "@/lib/server/editorial/admin";

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
    const updated = await updateProposalTriage(id, input, identity);

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...updated,
      detail:
        updated.draftGenerationState === "failed"
          ? "상태는 바뀌었지만 초안 생성은 끝까지 이어지지 않았습니다. 제안 상세나 초안 화면에서 다시 확인해 주세요."
          : undefined,
    });
  } catch (error) {
    console.error("Failed to triage proposal", error);
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
