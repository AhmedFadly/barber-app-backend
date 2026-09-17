import { NextResponse, type NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The mobile app authenticates with bearer tokens, so open CORS is safe (and needed for Expo web).
  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
    return res;
  }

  // Admin dashboard: HTTP Basic Auth.
  const expected = `Basic ${btoa(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`)}`;
  if (!process.env.ADMIN_PASSWORD || req.headers.get("authorization") !== expected) {
    return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="REGENT Admin"' } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/admin"],
};
