import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signParticipantToken } from "@/lib/ws-jwt";

type RouteContext = { params: Promise<{ sessionCode: string }> };

const joinSchema = z.object({
  participantName: z
    .string()
    .trim()
    .min(1, "Nickname is required")
    .max(32, "Nickname max length is 32"),
});

export async function POST(request: Request, context: RouteContext) {
  const { sessionCode } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const session = await prisma.quizSession.findUnique({
    where: { sessionCode: sessionCode.toUpperCase() },
  });

  if (!session) return jsonError("Session not found", 404);
  if (session.state === "FINISHED") {
    return jsonError("Session already finished", 400);
  }

  // Optional logged-in user
  const betterAuthSession = await auth.api.getSession({
    headers: request.headers,
  });
  const userId = betterAuthSession?.user?.id ?? null;

  const participant = await prisma.participant.create({
    data: {
      sessionId: session.id,
      participantName: parsed.data.participantName,
      userId,
      totalScore: 0,
    },
  });

  // Mirror into WS memory so lobby counts stay accurate before sockets connect
  try {
    const baseUrl = process.env.WS_SERVER_URL ?? "http://localhost:3001";
    await fetch(
      `${baseUrl}/internal/sessions/${encodeURIComponent(session.sessionCode)}/participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WS_INTERNAL_SECRET}`,
        },
        body: JSON.stringify({
          participantId: participant.id,
          participantName: participant.participantName,
          totalScore: 0,
        }),
      },
    );
  } catch {
    // Non-fatal for join; socket connect will register again
  }

  const token = await signParticipantToken({
    sessionId: session.id,
    sessionCode: session.sessionCode,
    participantId: participant.id,
    participantName: participant.participantName,
  });

  return jsonOk(
    {
      token,
      expiresIn: "3h",
      wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001",
      participant,
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        state: session.state,
      },
    },
    201,
  );
}
