import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { createInternalIndustryAnalysisEntry } from "@/lib/server/editorial-v2/workflow";
import { internalAnalysisBriefInputSchema } from "@/lib/server/editorial-v2/schema";

export const runtime = "nodejs";

function parseLineList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [] as string[];
  }

  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function buildFormErrorRedirect(request: Request, code: string) {
  const redirectUrl = new URL("/admin/internal/industry-analysis/new", request.url);
  redirectUrl.searchParams.set("error", code);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function getValidationErrorCode(error: ZodError) {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "validation";
  }

  const [path] = firstIssue.path;

  if (path === "sourceLinks") {
    return "source_links_limit";
  }

  if (path === "tags") {
    return "tags_limit";
  }

  if (path === "workingTitle") {
    return "working_title_invalid";
  }

  if (path === "brief") {
    return "brief_invalid";
  }

  return "validation";
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
      brief: getTextValue(formData.get("brief")),
      market: getTextValue(formData.get("market")),
      tags: parseLineList(formData.get("tags")),
      sourceLinks: parseLineList(formData.get("sourceLinks")),
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

    if (error instanceof ZodError) {
      return buildFormErrorRedirect(request, getValidationErrorCode(error));
    }

    return buildFormErrorRedirect(request, "create_failed");
  }
}
