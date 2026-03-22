import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { publishFeatureRevisionById } from "@/lib/server/editorial-v2/published";

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
    const published = await publishFeatureRevisionById(revisionId, identity.email);

    if (!published) {
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
      ...published,
    });
  } catch (error) {
    const rawDetail = error instanceof Error ? error.message : null;
    const detail = rawDetail?.startsWith("feature_revision_not_ready:")
      ? "발행실에서 먼저 발행 준비 상태를 만든 뒤 발행할 수 있습니다."
      : "공개 발행을 완료하지 못했습니다.";

    return NextResponse.json(
      {
        ok: false,
        error: "feature_publish_failed",
        detail,
        rawDetail,
      },
      { status: 400 },
    );
  }
}
