import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  createOrUpdatePublicationSnapshot,
  getPublicationSnapshot,
} from "@/lib/server/editorial/publication";

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
  const snapshot = await getPublicationSnapshot(proposalId);

  if (!snapshot) {
    return NextResponse.json(
      {
        ok: false,
        error: "publication_snapshot_not_found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    snapshot,
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

  const { proposalId } = await params;
  const snapshot = await createOrUpdatePublicationSnapshot(proposalId, identity.email);

  if (!snapshot) {
    return NextResponse.json(
      {
        ok: false,
        error: "publication_snapshot_failed",
      },
      { status: 400 },
    );
  }

  if ("kind" in snapshot) {
    return NextResponse.json(
      {
        ok: false,
        error:
          snapshot.kind === "not_ready"
            ? "proposal_not_ready_for_snapshot"
            : "publication_snapshot_failed",
        status: snapshot.kind,
      },
      { status: snapshot.kind === "not_found" ? 404 : 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}
