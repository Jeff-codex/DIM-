import { NextResponse } from "next/server";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { uploadEditorialV2ImageForProposal } from "@/lib/server/editorial-v2/workflow";

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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "editorial_image_missing",
        },
        { status: 400 },
      );
    }

    const result = await uploadEditorialV2ImageForProposal(
      id,
      file,
      identity.email,
    );

    return NextResponse.json({
      ok: true,
      family: result.family,
      draft: result.draft,
    });
  } catch (error) {
    console.error("Failed to upload v2 editorial image", error);
    const rawDetail =
      error instanceof Error ? error.message : "editorial_image_upload_failed";

    return NextResponse.json(
      {
        ok: false,
        error: rawDetail,
        detail:
          humanizeDraftGenerationErrorMessage(rawDetail) ??
          "새 이미지를 추가하지 못했습니다.",
        rawDetail,
      },
      { status: 400 },
    );
  }
}
