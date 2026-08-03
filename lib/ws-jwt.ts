import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const TOKEN_TTL = "3h";

export type HostJwtPayload = {
  role: "host";
  sessionId: string;
  sessionCode: string;
  userId: string;
};

export type ParticipantJwtPayload = {
  role: "participant";
  sessionId: string;
  sessionCode: string;
  participantId: string;
  participantName: string;
};

export type WsJwtPayload = HostJwtPayload | ParticipantJwtPayload;

function getSecretKey() {
  const secret = process.env.WS_JWT_SECRET;
  if (!secret) {
    throw new Error("WS_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signHostToken(
  payload: Omit<HostJwtPayload, "role">,
): Promise<string> {
  return new SignJWT({ ...payload, role: "host" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}

export async function signParticipantToken(
  payload: Omit<ParticipantJwtPayload, "role">,
): Promise<string> {
  return new SignJWT({ ...payload, role: "participant" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}

export async function verifyWsToken(token: string): Promise<WsJwtPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const role = payload.role;
  if (role !== "host" && role !== "participant") {
    throw new Error("Invalid token role");
  }
  return payload as unknown as WsJwtPayload;
}

export function isHostPayload(
  payload: JWTPayload | WsJwtPayload,
): payload is HostJwtPayload {
  return (payload as WsJwtPayload).role === "host";
}
