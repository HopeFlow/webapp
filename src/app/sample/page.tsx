import { withUser } from "@/helpers/server/page_component";
import { Test } from "./test";
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

export default withUser(async function SamplePage({ user }) {
  const jwt = await createRealtimeJwt({ userId: user?.id });
  return <Test jwt={jwt} />;
});
