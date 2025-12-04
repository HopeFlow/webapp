"use server";

import { type JWTPayload, SignJWT } from "jose";
import { defineServerFunction } from "./define_server_function";
import { currentUserNoThrow } from "./auth";

export const createRealtimeJwt = defineServerFunction({
  id: "createRealtimeJwt",
  scope: "realtime",
  handler: async (payload: JWTPayload) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("You have to login before creating token");

    const secret = process.env.REALTIME_JWT_SECRET;
    if (!secret) {
      throw new Error("REALTIME_JWT_SECRET is not configured");
    }

    const secretKey = new TextEncoder().encode(secret);

    return new SignJWT({ ...payload, userId: user.id })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secretKey);
  },
});
