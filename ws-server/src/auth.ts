import { SignJWT, jwtVerify } from "jose";
import type { WsJwt } from "./types.js";

const TOKEN_TTL = "3h";

function getSecretKey() {
  const secret = process.env.WS_JWT_SECRET;
  if (!secret) throw new Error("WS_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function verifyWsToken(token: string): Promise<WsJwt> {
  const { payload } = await jwtVerify(token, getSecretKey());
  if (payload.role !== "host" && payload.role !== "participant") {
    throw new Error("Invalid token role");
  }
  return payload as unknown as WsJwt;
}

export async function signHostToken(input: {
  sessionId: string;
  sessionCode: string;
  userId: string;
}) {
  return new SignJWT({ ...input, role: "host" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}
