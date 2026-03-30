import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "depthintelligence.kr";
const WWW_HOST = "www.depthintelligence.kr";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function shouldSkipCanonicalization(hostname: string) {
  return (
    LOCAL_HOSTS.has(hostname) ||
    hostname.endsWith(".workers.dev") ||
    hostname.endsWith(".pages.dev")
  );
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  const originalProto = forwardedProto || url.protocol.replace(":", "");
  const needsHostRedirect = url.hostname === WWW_HOST;
  const needsProtocolRedirect =
    (url.hostname === CANONICAL_HOST || url.hostname === WWW_HOST) &&
    originalProto !== "https";

  if (shouldSkipCanonicalization(url.hostname)) {
    return NextResponse.next();
  }

  if (!needsHostRedirect && !needsProtocolRedirect) {
    return NextResponse.next();
  }

  url.hostname = CANONICAL_HOST;
  url.protocol = "https:";
  url.port = "";

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/:path*",
};
