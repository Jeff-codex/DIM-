import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByProposalId,
  prepareEditorialV2RevisionForPublish,
} from "@/lib/server/editorial-v2/workflow";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
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

  const { proposalId } = await params;
  const draft = await getEditorialV2DraftByProposalId(proposalId);

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
  { params }: { params: Promise<{ proposalId: string }> },
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
    const { proposalId } = await params;
    const draft = await prepareEditorialV2RevisionForPublish(
      proposalId,
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
  } catch (error) {
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "feature_revision_snapshot_failed",
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "발행 준비본을 만들지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
