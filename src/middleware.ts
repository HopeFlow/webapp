// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hrefToLogin, isPublicUrl } from "@/helpers/server/routes"; // generated

function getBaseUrl(req: Request): string {
  const h = req.headers;
  if (h.get("X-Base-Url")) return h.get("X-Base-Url")!;
  if (h.get("host")) return `http://${h.get("host")}`;
  return "https://hopeflow.org";
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;

  const updatedHeaders = new Headers(request.headers);
  updatedHeaders.set("X-Cur-Path", pathname);

  if (isPublicUrl(request.nextUrl.href)) {
    return NextResponse.next({ request: { headers: updatedHeaders } });
  }

  const { userId } = await auth();
  if (!userId) {
    const base = getBaseUrl(request);
    const returnTo = `${pathname}${search || ""}`;
    const loginPath = hrefToLogin({ url: returnTo });
    return NextResponse.redirect(new URL(loginPath, base));
  }

  return NextResponse.next({ request: { headers: updatedHeaders } });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
