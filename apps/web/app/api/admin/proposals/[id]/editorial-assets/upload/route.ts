import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import { uploadEditorialImageForProposal } from "@/lib/server/editorial/assets";

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

    return NextResponse.json({
      ok: true,
      family,
    });
  } catch (error) {
    console.error("Failed to upload editorial image", error);

    const message =
      error instanceof Error ? error.message : "editorial_image_upload_failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
