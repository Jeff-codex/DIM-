import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { publishFeatureRevisionById } from "@/lib/server/editorial-v2/published";

export const runtime = "nodejs";

async function readPublishRequest(request: Request) {
  try {
    const payload = (await request.json()) as {
      finalSlug?: unknown;
      finalCoverImageAltText?: unknown;
    } | null;

    return {
      finalSlug:
        typeof payload?.finalSlug === "string" ? payload.finalSlug : null,
      finalCoverImageAltText:
        typeof payload?.finalCoverImageAltText === "string"
          ? payload.finalCoverImageAltText
          : null,
    };
  } catch {
    return {
      finalSlug: null,
      finalCoverImageAltText: null,
    };
  }
}

export async function POST(
  request: Request,
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
    const { finalSlug, finalCoverImageAltText } = await readPublishRequest(request);
    const published = await publishFeatureRevisionById(revisionId, identity.email, {
      finalSlug,
      finalCoverImageAltText,
    });

    if (!published) {
      return NextResponse.json(
        {
          ok: false,
          error: "feature_revision_not_found",
        },
        { status: 404 },
      );
    }

    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath(`/articles/${published.slug}`);
    revalidatePath("/admin/published");
    revalidatePath(`/admin/published/${published.slug}`);

    return NextResponse.json({
      ok: true,
      ...published,
    });
  } catch (error) {
    const rawDetail = error instanceof Error ? error.message : null;
    const detail = rawDetail?.startsWith("feature_revision_not_ready:")
      ? "발행실에서 먼저 발행 준비 상태를 만든 뒤 발행할 수 있습니다."
      : rawDetail?.startsWith("feature_slug_publish_invalid:")
        ? rawDetail.replace("feature_slug_publish_invalid:", "").trim() ||
          "최종 slug가 비어 있거나 다른 경로와 충돌합니다."
      : rawDetail?.startsWith("feature_slug_preflight_failed:")
        ? rawDetail.replace("feature_slug_preflight_failed:", "").trim() ||
          "현재 slug가 발행 기준을 통과하지 못했습니다. 추천 slug를 먼저 확인해 주세요."
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
