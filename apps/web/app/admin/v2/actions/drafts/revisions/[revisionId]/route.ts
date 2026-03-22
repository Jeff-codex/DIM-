import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByRevisionId,
  updateEditorialV2DraftByRevisionId,
} from "@/lib/server/editorial-v2/workflow";
import { editorialV2DraftInputSchema } from "@/lib/server/editorial-v2/schema";

export const runtime = "nodejs";

export async function GET(
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

  const { revisionId } = await params;
  const draft = await getEditorialV2DraftByRevisionId(revisionId);

  if (!draft) {
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
    draft,
  });
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
    const input = editorialV2DraftInputSchema.parse(await request.json());
    const updated = await updateEditorialV2DraftByRevisionId(
      revisionId,
      input,
      identity.email,
    );

    if (!updated) {
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
      draft: updated,
    });
  } catch (error) {
    console.error("Failed to save v2 editorial draft by revision", error);
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "feature_revision_save_failed",
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "편집 초안을 저장하지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
