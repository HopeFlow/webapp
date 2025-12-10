import { JWTPayload, SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose";

export type JwtPayload = JWTPayload & { [k: string]: unknown };

const isJwtPayload = (payload: unknown): payload is JwtPayload =>
  typeof payload === "object" && payload !== null;

const ALGORITHM = "RS256";

export const decodeJwtToken = async (token: string, publicKey: string) => {
  const key = await importSPKI(publicKey, ALGORITHM);
  const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
  if (!isJwtPayload(payload)) throw new Error("Invalid JWT payload");

  const currentTime = Math.floor(Date.now() / 1000);
  if (
    (typeof payload.exp === "number" && payload.exp < currentTime) ||
    (typeof payload.nbf === "number" && payload.nbf > currentTime)
  )
    throw new Error("Token is expired or not yet valid");

  // if (payload.azp && !permittedOrigins.includes(payload.azp))
  //   throw new Error(`Invalid origin: ${payload.azp}`);

  return payload;
};

export const encodeJwtToken = async (
  payload: JwtPayload,
  privateKey: string,
) => {
  const key = await importPKCS8(privateKey, ALGORITHM);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .sign(key);
};
