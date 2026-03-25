import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { deleteInternalIndustryAnalysisEntryByRevisionId } from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ revisionId: string }> },
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
    const { revisionId } = await params;
    const deleted = await deleteInternalIndustryAnalysisEntryByRevisionId(
      revisionId,
      identity.email,
    );

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "internal_analysis_not_found",
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
    const detail =
      rawDetail === "internal_analysis_already_published"
        ? "이미 공개된 내부 글은 여기서 삭제할 수 없습니다. 발행 관리에서 처리해 주세요."
        : "작성 중인 내부 글을 삭제하지 못했습니다.";

    return NextResponse.json(
      {
        ok: false,
        error: "internal_analysis_delete_failed",
        detail,
        rawDetail,
      },
      { status: 400 },
    );
  }
}
