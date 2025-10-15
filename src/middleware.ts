// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isPublicUrl } from "@/helpers/server/routes"; // generated
import { X_CUR_URL_HEADER } from "./helpers/server/constants";
import { clerkClientNoThrow } from "./helpers/server/auth";

function getBaseUrl(req: Request): string {
  const h = req.headers;
  if (h.get("X-Base-Url")) return h.get("X-Base-Url")!;
  if (h.get("host")) return `http://${h.get("host")}`;
  return "https://hopeflow.org";
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;

  const updatedHeaders = new Headers(request.headers);
  updatedHeaders.set(X_CUR_URL_HEADER, request.nextUrl.toString());

  if (isPublicUrl(request.nextUrl.href)) {
    return NextResponse.next({ request: { headers: updatedHeaders } });
  }

  const { userId } = await auth();
  let userProfileCreated = false;
  if (userId) {
    try {
      const user = await (await clerkClientNoThrow())?.users.getUser(userId);
      userProfileCreated = Boolean(user?.publicMetadata.userProfileCreated);
    } catch {
      console.error("Error fetching user");
      // If there's an error fetching the user, treat as not created
      userProfileCreated = false;
    }
  }

  if (!userId || !userProfileCreated) {
    const base = getBaseUrl(request);
    const returnTo = `${pathname}${search || ""}`;
    const loginPath = `/${
      userId ? "create_account" : "login"
    }?url=${encodeURIComponent(returnTo)}`;
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
