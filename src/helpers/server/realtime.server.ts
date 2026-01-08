"use server";
import { JWTPayload, SignJWT } from "jose";
import { currentUserNoThrow } from "./auth";

export const createRealtimeJwt = async (payload?: JWTPayload) => {
  const user = await currentUserNoThrow();
  if (!user) return "";

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
};
