import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { suggestInternalAnalysisFrameByRevisionId } from "@/lib/server/editorial-v2/internal-assist";

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
    const suggestion = await suggestInternalAnalysisFrameByRevisionId(revisionId);

    return NextResponse.json({
      ok: true,
      suggestion,
    });
  } catch (error) {
    const rawDetail =
      error instanceof Error ? error.message : "internal_analysis_ai_assist_failed";
    const detail =
      rawDetail === "internal_analysis_ai_not_configured"
        ? "이 runtime에는 direct OpenAI key가 없어 내부 작성용 AI 보조 기능을 아직 사용할 수 없습니다."
        : rawDetail === "internal_analysis_revision_not_found"
          ? "내부 산업 구조 분석 작업본을 찾지 못했습니다."
          : rawDetail === "internal_analysis_revision_invalid_source"
            ? "이 작업본은 내부 산업 구조 분석 보조 기능 대상이 아닙니다."
            : "분석 프레임 제안을 불러오지 못했습니다.";

    return NextResponse.json(
      {
        ok: false,
        error: "internal_analysis_ai_assist_failed",
        detail,
        rawDetail,
      },
      { status: 400 },
    );
  }
}
