import { NextResponse } from "next/server";
import {
  getAdminIdentity,
  proposalTriageSchema,
  updateProposalTriage,
} from "@/lib/server/editorial/admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
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
    const input = proposalTriageSchema.parse(await request.json());
    const updated = await updateProposalTriage(id, input, identity);

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...updated,
    });
  } catch (error) {
    console.error("Failed to triage proposal", error);

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_triage_failed",
      },
      { status: 400 },
    );
  }
}
