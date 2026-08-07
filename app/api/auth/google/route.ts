import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/integrations/google-search-console";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const url = getGoogleAuthUrl(redirectUri);

  return NextResponse.redirect(url);
}
