import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  editorialDraftInputSchema,
  ensureEditorialDraftForProposal,
  regenerateEditorialDraftForProposal,
  updateEditorialDraft,
} from "@/lib/server/editorial/draft";

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
  const draft = await ensureEditorialDraftForProposal(proposalId, identity.email);

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
    const input = editorialDraftInputSchema.parse(await request.json());
    const updated = await updateEditorialDraft(proposalId, input, identity.email);

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "editorial_draft_not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      draft: updated,
    });
  } catch (error) {
    console.error("Failed to save editorial draft", error);
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "editorial_draft_save_failed",
        detail: humanizeDraftGenerationErrorMessage(rawDetail) ?? "편집 초안을 저장하지 못했습니다.",
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
    const draft = await regenerateEditorialDraftForProposal(proposalId, identity.email);

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
    console.error("Failed to regenerate editorial draft", error);
    const rawDetail = error instanceof Error ? error.message : null;

    return NextResponse.json(
      {
        ok: false,
        error: "editorial_draft_regenerate_failed",
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "초안을 다시 만들지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
