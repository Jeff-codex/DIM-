import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  ensureEditorialV2DraftForProposal,
  getEditorialV2DraftByProposalId,
  updateEditorialV2Draft,
} from "@/lib/server/editorial-v2/workflow";
import { editorialV2DraftInputSchema } from "@/lib/server/editorial-v2/schema";

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
    const input = editorialV2DraftInputSchema.parse(await request.json());
    const updated = await updateEditorialV2Draft(proposalId, input, identity.email);

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
    console.error("Failed to save v2 editorial draft", error);
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

export async function PUT(
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

  try {
    const draft = await ensureEditorialV2DraftForProposal(
      proposalId,
      identity.email,
      { forceRegenerate: true },
    );

    if (draft.kind === "not_found") {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_found",
        },
        { status: 404 },
      );
    }

    if (draft.kind === "not_ready") {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_ready_for_draft",
          status: draft.status,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      draft: draft.draft,
    });
  } catch (error) {
    console.error("Failed to regenerate v2 editorial draft", error);
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "feature_revision_regenerate_failed",
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "초안을 다시 만들지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
