import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ROUTE_PREFIX = "/r2";

const decodePathComponent = (component: string) => {
  try {
    return decodeURIComponent(component);
  } catch {
    return component;
  }
};

const extractKeyFromRequest = (request: NextRequest) => {
  const { pathname, searchParams } = request.nextUrl;

  let rawKey = "";

  if (pathname === ROUTE_PREFIX || pathname === `${ROUTE_PREFIX}/`) {
    rawKey = searchParams.get("key") ?? "";
  } else if (pathname.startsWith(`${ROUTE_PREFIX}/`)) {
    rawKey = pathname.slice(ROUTE_PREFIX.length + 1);
  }

  if (!rawKey) {
    rawKey = searchParams.get("key") ?? "";
  }

  rawKey = rawKey.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (!rawKey) return undefined;

  return rawKey.split("/").map(decodePathComponent).join("/");
};

export async function GET(request: NextRequest) {
  const key = extractKeyFromRequest(request);
  if (!key) {
    return new Response("Missing R2 object key", { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.hopeflow;

  if (!bucket) {
    return new Response("R2 bucket not configured", { status: 500 });
  }

  try {
    const object = await bucket.get(key);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/octet-stream");
    }
    if (!headers.has("cache-control")) {
      headers.set("cache-control", "public, max-age=120");
    }

    headers.set("etag", object.etag);
    headers.set("content-length", object.size.toString());

    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error("Failed to read R2 key", { key, error });
    return new Response("Failed to read R2 object", { status: 500 });
  }
}
