import jwt from "jsonwebtoken";

function isJwt(o: unknown): o is jwt.Jwt {
  return (
    typeof o === "object" &&
    o !== null &&
    typeof (o as jwt.Jwt).payload === "object" &&
    (o as jwt.Jwt).payload !== null
  );
}

export type JwtPayload = jwt.JwtPayload & { [k: string]: unknown };

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return typeof payload === "object" && payload !== null;
}

export const decodeJwtToken = (token: string, publicKey: string) => {
  const options = { algorithms: ["RS256" as jwt.Algorithm], complete: true };
  // const permittedOrigins = [
  //   "http://localhost:3000",
  //   "https://hopeflow.org",
  //   "https://rt.hopeflow.org",
  // ];
  //
  const decoded = (() => {
    const j = jwt.verify(token, publicKey, options);
    if (!isJwt(j)) throw new Error("Invalid JWT");
    const p = j.payload;
    if (!isJwtPayload(p)) throw new Error("Invalid JWT payload");
    return p;
  })();

  const currentTime = Math.floor(Date.now() / 1000);
  if (
    (typeof decoded.exp === "number" && decoded.exp < currentTime) ||
    (typeof decoded.nbf === "number" && decoded.nbf > currentTime)
  )
    throw new Error("Token is expired or not yet valid");

  // if (decoded.azp && !permittedOrigins.includes(decoded.azp))
  //   throw new Error(`Invalid origin: ${decoded.azp}`);

  return decoded;
};

export const encodeJwtToken = (payload: JwtPayload, privateKey: string) => {
  const options = { algorithm: "RS256" as jwt.Algorithm };
  return jwt.sign(payload, privateKey, options);
};
