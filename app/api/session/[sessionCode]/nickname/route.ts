import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { signParticipantToken } from "@/lib/ws-jwt";

type RouteContext = { params: Promise<{ sessionCode: string }> };

const nicknameSchema = z.object({
  participantId: z.string().uuid(),
  participantName: z
    .string()
    .trim()
    .min(1, "Nickname is required")
    .max(32, "Nickname max length is 32"),
});

/** Update display name while still in the waiting room (before / during lobby). */
export async function PATCH(request: Request, context: RouteContext) {
  const { sessionCode } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = nicknameSchema.safeParse(body);
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

  const participant = await prisma.participant.findFirst({
    where: {
      id: parsed.data.participantId,
      sessionId: session.id,
    },
  });
  if (!participant) return jsonError("Participant not found", 404);

  const updated = await prisma.participant.update({
    where: { id: participant.id },
    data: { participantName: parsed.data.participantName },
  });

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
          participantId: updated.id,
          participantName: updated.participantName,
          totalScore: updated.totalScore,
        }),
      },
    );
  } catch {
    // Non-fatal; JWT + DB are source of truth for next connect
  }

  const token = await signParticipantToken({
    sessionId: session.id,
    sessionCode: session.sessionCode,
    participantId: updated.id,
    participantName: updated.participantName,
  });

  return jsonOk({
    token,
    participant: {
      id: updated.id,
      participantName: updated.participantName,
    },
  });
}
