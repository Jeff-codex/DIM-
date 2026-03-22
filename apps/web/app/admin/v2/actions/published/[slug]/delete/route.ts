import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { deletePublishedFeatureBySlug } from "@/lib/server/editorial-v2/published";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
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
    const { slug } = await params;
    const deleted = await deletePublishedFeatureBySlug(slug, identity.email);

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "feature_not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...deleted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "published_feature_delete_failed",
        detail: "공개 피처를 삭제하지 못했습니다.",
        rawDetail: error instanceof Error ? error.message : null,
      },
      { status: 400 },
    );
  }
}
