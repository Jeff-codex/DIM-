import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByRevisionId,
  prepareEditorialV2RevisionForPublishByRevisionId,
} from "@/lib/server/editorial-v2/workflow";

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

  if (!draft || draft.status !== "ready_to_publish") {
    return NextResponse.json(
      {
        ok: false,
        error: "feature_revision_not_ready_to_publish",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    snapshot: {
      articleSlug: draft.articleSlug,
      title: draft.title,
      updatedAt: draft.updatedAt,
      status: draft.status,
    },
  });
}

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

  const { revisionId } = await params;
  const draft = await prepareEditorialV2RevisionForPublishByRevisionId(
    revisionId,
    identity.email,
  );

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
    snapshot: {
      articleSlug: draft.articleSlug,
      title: draft.title,
      updatedAt: draft.updatedAt,
      status: draft.status,
    },
  });
}
