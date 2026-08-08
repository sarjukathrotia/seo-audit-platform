import * as tls from "tls";
import { URL } from "url";

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  html: string;
  headers: Record<string, string>;
  contentType: string;
  redirectChain: string[];
  sslInfo?: {
    valid: boolean;
    daysRemaining: number;
    issuer?: string;
    protocol?: string;
    error?: string;
  };
}

const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; SEOAuditBot/1.0; +https://example.com/bot)";

export async function fetchUrl(
  url: string,
  timeoutMs = 12000,
  maxRedirects = 5
): Promise<FetchResult> {
  const startTime = Date.now();
  let currentUrl = url;
  const redirectChain: string[] = [];
  let statusCode = 0;
  let html = "";
  let headers: Record<string, string> = {};
  let contentType = "text/html";

  // Check SSL if HTTPS
  let sslInfo: FetchResult["sslInfo"] = undefined;
  if (url.startsWith("https://")) {
    try {
      sslInfo = await inspectSsl(url);
    } catch {
      sslInfo = { valid: false, daysRemaining: 0, error: "SSL Handshake failed" };
    }
  }

  try {
    let redirectsCount = 0;
    while (redirectsCount <= maxRedirects) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(currentUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = res.status;

      // Collect headers
      res.headers.forEach((val, key) => {
        headers[key.toLowerCase()] = val;
      });
      contentType = headers["content-type"] || "text/html";

      // Handle redirect
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        const location = res.headers.get("location");
        if (!location) {
          break;
        }
        redirectChain.push(currentUrl);
        currentUrl = new URL(location, currentUrl).href;
        redirectsCount++;
        continue;
      }

      // Read response body if HTML
      if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || contentType.includes("text/plain")) {
        html = await res.text();
      }
      break;
    }

    const responseTimeMs = Date.now() - startTime;

    return {
      url,
      finalUrl: currentUrl,
      statusCode,
      responseTimeMs,
      html,
      headers,
      contentType,
      redirectChain,
      sslInfo,
    };
  } catch (err: any) {
    return {
      url,
      finalUrl: currentUrl,
      statusCode: err.name === "AbortError" ? 408 : 500,
      responseTimeMs: Date.now() - startTime,
      html: "",
      headers,
      contentType: "text/html",
      redirectChain,
      sslInfo,
    };
  }
}

export function inspectSsl(targetUrl: string): Promise<FetchResult["sslInfo"]> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port, 10) : 443;

      const socket = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false,
          timeout: 4000,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            const authorized = socket.authorized;
            if (!cert || !cert.valid_to) {
              socket.destroy();
              return resolve({ valid: false, daysRemaining: 0, error: "No peer certificate" });
            }

            const validTo = new Date(cert.valid_to);
            const now = new Date();
            const daysRemaining = Math.max(0, Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const issuerRaw = cert.issuer ? (cert.issuer.O || cert.issuer.CN) : "Unknown";
            const issuer = Array.isArray(issuerRaw) ? issuerRaw.join(", ") : issuerRaw || "Unknown";
            const protocol = socket.getProtocol() || undefined;

            socket.destroy();
            resolve({
              valid: authorized && daysRemaining > 0,
              daysRemaining,
              issuer,
              protocol,
            });
          } catch (e: any) {
            socket.destroy();
            resolve({ valid: false, daysRemaining: 0, error: e.message });
          }
        }
      );

      socket.on("error", (err) => {
        socket.destroy();
        resolve({ valid: false, daysRemaining: 0, error: err.message });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ valid: false, daysRemaining: 0, error: "TLS connection timed out" });
      });
    } catch (e: any) {
      resolve({ valid: false, daysRemaining: 0, error: e.message });
    }
  });
}
