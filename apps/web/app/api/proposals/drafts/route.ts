import { NextResponse } from "next/server";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { proposalDraftSchema } from "@/lib/server/editorial/intake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const env = await getEditorialEnv();
    const input = proposalDraftSchema.parse(await request.json());
    const draftId = input.draftId ?? crypto.randomUUID();
    const now = new Date().toISOString();

    await env.EDITORIAL_DB.prepare(
      `INSERT INTO proposal_draft (
         id,
         payload_json,
         locale,
         created_at,
         updated_at
       ) VALUES (?, ?, 'ko-KR', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`,
    )
      .bind(draftId, JSON.stringify(input.payload), now, now)
      .run();

    return NextResponse.json(
      {
        ok: true,
        draftId,
        updatedAt: now,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to save proposal draft", error);

    return NextResponse.json(
      {
        ok: false,
        error: "proposal_draft_save_failed",
      },
      { status: 400 },
    );
  }
}
