import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { signHostToken } from "@/lib/ws-jwt";

type RouteContext = { params: Promise<{ sessionCode: string }> };

/** Mint host JWT while in the waiting-room host view (`/join-quiz/:code/host`). */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { sessionCode } = await context.params;
  const session = await prisma.quizSession.findUnique({
    where: { sessionCode: sessionCode.toUpperCase() },
    include: { quiz: { select: { userId: true } } },
  });

  if (!session) return jsonError("Session not found", 404);
  if (session.quiz.userId !== authResult.userId) {
    return jsonError("Forbidden", 403);
  }

  if (session.state === "FINISHED") {
    return jsonError("Session already finished", 400);
  }

  const token = await signHostToken({
    sessionId: session.id,
    sessionCode: session.sessionCode,
    userId: authResult.userId,
  });

  return jsonOk({
    token,
    expiresIn: "3h",
    wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001",
    session: {
      id: session.id,
      sessionCode: session.sessionCode,
      state: session.state,
    },
  });
}
