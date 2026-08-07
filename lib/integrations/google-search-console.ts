export interface GscTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface GscSiteItem {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscQueryRow {
  keys: string[]; // [query] or [page, query]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscAnalyticsSummary {
  siteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  topPages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}

const GSC_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GSC_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/**
 * 1. Generates the Google OAuth 2.0 authorization URL
 */
export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  if (state) params.set("state", state);
  return `${GSC_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * 2. Exchanges OAuth authorization code for Access & Refresh Tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GscTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const res = await fetch(GSC_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange Google OAuth code: ${errText}`);
  }

  return res.json();
}

/**
 * 3. Lists verified properties for the authenticated user
 */
export async function getGscSites(accessToken: string): Promise<GscSiteItem[]> {
  const res = await fetch(`${GSC_API_BASE}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Google Search Console sites: ${errText}`);
  }

  const data = await res.json();
  const siteEntries = data.siteEntry || [];
  return siteEntries.map((s: any) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
}

/**
 * 4. Queries Search Analytics (Clicks, Impressions, CTR, Position, Top Queries)
 */
export async function getGscSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  days = 28
): Promise<GscAnalyticsSummary> {
  const endDate = new Date().toISOString().split("T")[0];
  const startObj = new Date();
  startObj.setDate(startObj.getDate() - days);
  const startDate = startObj.toISOString().split("T")[0];

  const encodedSite = encodeURIComponent(siteUrl);

  // Fetch Query dimensions
  const queryRes = await fetch(`${GSC_API_BASE}/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 25,
    }),
  });

  // Fetch Page dimensions
  const pageRes = await fetch(`${GSC_API_BASE}/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 25,
    }),
  });

  const queryData = queryRes.ok ? await queryRes.json() : { rows: [] };
  const pageData = pageRes.ok ? await pageRes.json() : { rows: [] };

  const queryRows: GscQueryRow[] = queryData.rows || [];
  const pageRows: GscQueryRow[] = pageData.rows || [];

  let totalClicks = 0;
  let totalImpressions = 0;
  let weightedPosition = 0;

  for (const r of queryRows) {
    totalClicks += r.clicks;
    totalImpressions += r.impressions;
    weightedPosition += r.position * r.impressions;
  }

  const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const averagePosition = totalImpressions > 0 ? parseFloat((weightedPosition / totalImpressions).toFixed(1)) : 0;

  const topQueries = queryRows.map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: parseFloat((r.ctr * 100).toFixed(2)),
    position: parseFloat(r.position.toFixed(1)),
  }));

  const topPages = pageRows.map((r) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: parseFloat((r.ctr * 100).toFixed(2)),
    position: parseFloat(r.position.toFixed(1)),
  }));

  return {
    siteUrl,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    topQueries,
    topPages,
  };
}
