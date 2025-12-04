import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

// export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const key = (await params).slug.join("/");
  console.log({ key });
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
    // object.writeHttpMetadata(headers);
    const meta = object.httpMetadata;
    if (meta?.contentType) {
      headers.set("content-type", meta.contentType);
    }
    if (meta?.contentLanguage) {
      headers.set("content-language", meta.contentLanguage);
    }
    if (meta?.cacheControl) {
      headers.set("cache-control", meta.cacheControl);
    }
    if (meta?.contentDisposition) {
      headers.set("content-disposition", meta.contentDisposition);
    }
    if (meta?.contentEncoding) {
      headers.set("content-encoding", meta.contentEncoding);
    }

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
