import { NextResponse } from "next/server";
import {
  deleteRejectedProposal,
  getAdminIdentity,
} from "@/lib/server/editorial/admin";

export const runtime = "nodejs";

function toDeleteErrorDetail(rawDetail: string | null) {
  switch (rawDetail) {
    case "proposal_delete_requires_rejected":
      return "반려 상태인 제안만 삭제할 수 있습니다.";
    case "proposal_delete_forbidden_source":
      return "발행 관리에서 만든 개정 제안은 여기서 삭제할 수 없습니다.";
    case "proposal_delete_has_editorial_artifacts":
      return "이미 원고나 발행 자산이 연결된 제안이라 삭제할 수 없습니다.";
    default:
      return "반려된 제안을 삭제하지 못했습니다.";
  }
}

export async function POST(
  _request: Request,
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
    const deleted = await deleteRejectedProposal(id, identity);

    if (!deleted) {
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
      ...deleted,
    });
  } catch (error) {
    const rawDetail = error instanceof Error ? error.message : null;
    const detail = toDeleteErrorDetail(rawDetail);
    const status =
      rawDetail === "proposal_delete_requires_rejected" ||
      rawDetail === "proposal_delete_forbidden_source" ||
      rawDetail === "proposal_delete_has_editorial_artifacts"
        ? 409
        : 400;

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_delete_failed",
        detail,
        rawDetail,
      },
      { status },
    );
  }
}
