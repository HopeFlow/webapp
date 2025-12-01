"use server";

import { withUser } from "@/helpers/server/page_component";
import { JWTPayload, SignJWT } from "jose";

const createRealtimeJwt = async (payload: JWTPayload) => {
  const secret = process.env.REALTIME_JWT_SECRET;
  if (!secret) {
    throw new Error("REALTIME_JWT_SECRET is not configured");
  }

  const secretKey = new TextEncoder().encode(secret);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey);
};

const doSomething = withUser(async function ({ user }) {
  const jwt = await createRealtimeJwt({ userId: user?.id });
  await fetch("https://realtime.vedadian.workers.dev/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      userId: user?.id,
      type: "message",
      message: new Date().toISOString(),
    }),
  });
  console.warn({ jwt });
  return null;
});

export default doSomething;
