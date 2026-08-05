import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ sessionCode: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { sessionCode } = await context.params;
  const session = await prisma.quizSession.findUnique({
    where: { sessionCode: sessionCode.toUpperCase() },
    include: {
      participants: {
        orderBy: { totalScore: "desc" },
        select: {
          id: true,
          participantName: true,
          totalScore: true,
        },
      },
      quiz: { select: { name: true, id: true } },
    },
  });

  if (!session) return jsonError("Session not found", 404);

  return jsonOk({
    session: {
      id: session.id,
      sessionCode: session.sessionCode,
      state: session.state,
      conductedAt: session.conductedAt,
      startedAt: session.startedAt ?? session.conductedAt,
      endedAt: session.endedAt,
      quiz: session.quiz,
      leaderboard: session.participants,
    },
  });
}
