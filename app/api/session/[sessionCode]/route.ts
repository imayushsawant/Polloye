import { jsonError, jsonOk, requireSession } from "@/lib/api";
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
      quiz: {
        select: {
          name: true,
          description: true,
          user: { select: { name: true } },
        },
      },
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
      quiz: {
        name: session.quiz.name,
        description: session.quiz.description,
        hostName: session.quiz.user.name,
      },
    },
  });
}

/** Host scraps / deletes a waiting-room or abandoned live session. */
export async function DELETE(request: Request, context: RouteContext) {
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
    return jsonError(
      "Finished sessions cannot be scrapped from the lobby",
      400,
    );
  }

  await prisma.quizSession.delete({ where: { id: session.id } });
  return jsonOk({ success: true });
}
