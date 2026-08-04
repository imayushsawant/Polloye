import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateUniqueSessionCode } from "@/lib/session-codes";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Open a waiting-room lobby only.
 * Does NOT load the quiz into WS memory — that happens on Begin quiz.
 */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id: quizId } = await context.params;
  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  });

  if (!quiz) return jsonError("Quiz not found", 404);
  if (quiz._count.questions === 0) {
    return jsonError("Quiz has no questions", 400);
  }

  const sessionCode = await generateUniqueSessionCode();

  const session = await prisma.quizSession.create({
    data: {
      quizId,
      sessionCode,
      state: "INACTIVE",
    },
  });

  return jsonOk({ session }, 201);
}
