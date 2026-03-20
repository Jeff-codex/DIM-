import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { enqueueProposalProcessingJobs } from "@/lib/server/editorial/queue";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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
    const { id } = await params;
    const env = await getEditorialEnv({
      requireBucket: false,
      requireQueue: true,
    });

    const proposal = await env.EDITORIAL_DB.prepare(
      `SELECT id
       FROM proposal
       WHERE id = ?
       LIMIT 1`,
    )
      .bind(id)
      .first<{ id: string }>();

    if (!proposal) {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_found",
        },
        { status: 404 },
      );
    }

    const queued = await enqueueProposalProcessingJobs(env, id, {
      note: "Queue 작업을 다시 실행했습니다",
      actorType: "editor",
      actorId: identity.email,
    });

    return NextResponse.json({
      proposalId: id,
      ...queued,
    });
  } catch (error) {
    console.error("Failed to rerun proposal queue jobs", error);

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_rerun_failed",
      },
      { status: 400 },
    );
  }
}
