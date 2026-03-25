import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { createInternalIndustryAnalysisEntry } from "@/lib/server/editorial-v2/workflow";
import { internalAnalysisBriefInputSchema } from "@/lib/server/editorial-v2/schema";

export const runtime = "nodejs";

function parseLineList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [] as string[];
  }

  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
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
    const formData = await request.formData();
    const input = internalAnalysisBriefInputSchema.parse({
      workingTitle: getTextValue(formData.get("workingTitle")),
      summary: getTextValue(formData.get("summary")),
      analysisScope: getTextValue(formData.get("analysisScope")),
      whyNow: getTextValue(formData.get("whyNow")),
      market: getTextValue(formData.get("market")),
      coreEntities: parseLineList(formData.get("coreEntities")),
      sourceLinks: parseLineList(formData.get("sourceLinks")),
      evidencePoints: parseLineList(formData.get("evidencePoints")),
      editorNotes: getTextValue(formData.get("editorNotes")),
    });

    const created = await createInternalIndustryAnalysisEntry(
      input,
      identity.email,
    );

    return NextResponse.redirect(
      new URL(
        `/admin/internal/industry-analysis/revisions/${created.revisionId}`,
        request.url,
      ),
      { status: 303 },
    );
  } catch (error) {
    console.error("Failed to create internal industry analysis entry", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_industry_analysis_create_failed",
        detail:
          error instanceof Error
            ? error.message
            : "산업 구조 분석 작성 entry를 만들지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
