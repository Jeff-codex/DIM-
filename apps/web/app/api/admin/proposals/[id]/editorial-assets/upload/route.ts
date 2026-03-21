import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { uploadEditorialImageForProposal } from "@/lib/server/editorial/assets";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import { updateEditorialDraftCoverImage } from "@/lib/server/editorial/draft";

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

    const family = await uploadEditorialImageForProposal(id, file, identity.email);

    if (!family?.master) {
      throw new Error("editorial_asset_family_store_failed");
    }

    const coverImageUrl = family?.detail?.publicUrl ?? family?.master?.publicUrl ?? null;
    const draft =
      coverImageUrl
        ? await updateEditorialDraftCoverImage(id, coverImageUrl, identity.email)
        : null;

    if (coverImageUrl && !draft) {
      throw new Error("editorial_draft_cover_apply_failed");
    }

    return NextResponse.json({
      ok: true,
      family,
      draft,
    });
  } catch (error) {
    console.error("Failed to upload editorial image", error);

    const rawDetail =
      error instanceof Error ? error.message : "editorial_image_upload_failed";
    const detail =
      humanizeDraftGenerationErrorMessage(rawDetail) ??
      "새 이미지를 추가하지 못했습니다.";
    const status =
      rawDetail === "editorial_image_missing" ||
      rawDetail === "editorial_image_type_invalid" ||
      rawDetail === "editorial_image_size_invalid" ||
      rawDetail === "image_too_small_for_editorial_master"
        ? 400
        : rawDetail.includes("editorial_asset_variant_store_failed") ||
            rawDetail.includes("editorial_asset_family_store_failed") ||
            rawDetail.includes("editorial_draft_cover_apply_failed") ||
            rawDetail.includes("editorial_image_generator_not_configured") ||
            rawDetail.includes("editorial_image_generator_failed")
          ? 500
          : 400;

    return NextResponse.json(
      {
        ok: false,
        error: rawDetail,
        detail,
        rawDetail,
      },
      { status },
    );
  }
}
