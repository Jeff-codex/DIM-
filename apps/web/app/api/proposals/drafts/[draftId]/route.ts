import { NextResponse } from "next/server";
import { getEditorialEnv } from "@/lib/server/editorial/env";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const env = await getEditorialEnv();
    const { draftId } = await params;
    const draft = await env.EDITORIAL_DB.prepare(
      `SELECT id, payload_json AS payloadJson, locale, created_at AS createdAt, updated_at AS updatedAt
       FROM proposal_draft
       WHERE id = ?
       LIMIT 1`,
    )
      .bind(draftId)
      .first<{
        id: string;
        payloadJson: string;
        locale: string;
        createdAt: string;
        updatedAt: string;
      }>();

    if (!draft) {
      return NextResponse.json(
        {
          ok: false,
          error: "proposal_draft_not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      draft: {
        id: draft.id,
        payload: JSON.parse(draft.payloadJson) as Record<string, string>,
        locale: draft.locale,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to load proposal draft", error);

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_draft_load_failed",
      },
      { status: 400 },
    );
  }
}
