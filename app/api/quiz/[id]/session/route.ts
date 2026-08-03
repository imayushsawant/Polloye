import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateUniqueSessionCode } from "@/lib/session-codes";
import { bootstrapWsSession } from "@/lib/ws-bootstrap";

type RouteContext = { params: Promise<{ id: string }> };

/** Host opens a live lobby: creates QuizSession (INACTIVE), loads quiz into WS memory. */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id: quizId } = await context.params;
  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: { options: true },
      },
    },
  });

  if (!quiz) return jsonError("Quiz not found", 404);
  if (quiz.questions.length === 0) {
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

  try {
    await bootstrapWsSession({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      quizId: quiz.id,
      hostUserId: authResult.userId,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        questionDescription: q.questionDescription,
        quesImgLink: q.quesImgLink,
        questionType: q.questionType,
        analyticsType: q.analyticsType,
        score: q.score,
        duration: q.duration,
        position: q.position,
        options: q.options.map((o) => ({
          id: o.id,
          optionDescription: o.optionDescription,
          optImgLink: o.optImgLink,
          optionNature: o.optionNature,
        })),
      })),
    });
  } catch (err) {
    await prisma.quizSession.delete({ where: { id: session.id } });
    return jsonError(
      err instanceof Error ? err.message : "Failed to bootstrap live session",
      502,
    );
  }

  return jsonOk({ session }, 201);
}
