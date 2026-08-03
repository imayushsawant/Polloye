import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ sessionCode: string }> };

/** Public session status for waiting-room polling. */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionCode } = await context.params;
  const session = await prisma.quizSession.findUnique({
    where: { sessionCode: sessionCode.toUpperCase() },
    select: {
      id: true,
      sessionCode: true,
      state: true,
      quizId: true,
      conductedAt: true,
      _count: { select: { participants: true } },
    },
  });

  if (!session) return jsonError("Session not found", 404);

  return jsonOk({
    session: {
      id: session.id,
      sessionCode: session.sessionCode,
      state: session.state,
      quizId: session.quizId,
      conductedAt: session.conductedAt,
      participantCount: session._count.participants,
    },
  });
}
