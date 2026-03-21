import { NextResponse } from "next/server";
import {
  createOrOpenRevisionProposalForPublishedFeature,
} from "@/lib/server/editorial/published";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return NextResponse.json({ error: "admin_access_required" }, { status: 401 });
  }

  const { slug } = await context.params;
  const result = await createOrOpenRevisionProposalForPublishedFeature(slug, identity.email);

  if (!result) {
    return NextResponse.json({ error: "published_feature_not_found" }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
}
