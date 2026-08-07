import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-search-console";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!code) {
    return NextResponse.redirect(`${origin}/?gsc_error=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    // In production, save tokens.access_token / tokens.refresh_token against user or session
    const response = NextResponse.redirect(`${origin}/?gsc_connected=true`);
    response.cookies.set("gsc_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokens.expires_in || 3600,
      path: "/",
    });
    return response;
  } catch (err: any) {
    console.error("GSC OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/?gsc_error=${encodeURIComponent(err.message)}`);
  }
}
