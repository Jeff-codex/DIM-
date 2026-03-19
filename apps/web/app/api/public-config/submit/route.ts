import { NextResponse } from "next/server";
import { getPublicSubmitSecurityConfig } from "@/lib/server/editorial/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await getPublicSubmitSecurityConfig();

    return NextResponse.json({
      ok: true,
      ...config,
    });
  } catch (error) {
    console.error("Failed to load public submit security config", error);

    return NextResponse.json(
      {
        ok: false,
        error: "submit_public_config_failed",
      },
      { status: 500 },
    );
  }
}
