import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { questionWithOptionsSchema } from "@/lib/validations/question";

type RouteContext = {
  params: Promise<{ id: string; questionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id: quizId, questionId } = await context.params;
  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  const existing = await prisma.question.findFirst({
    where: { id: questionId, quizId },
  });
  if (!existing) {
    return jsonError("Question not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = questionWithOptionsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { question, options } = parsed.data;

  if (question.position !== existing.position) {
    const conflict = await prisma.question.findUnique({
      where: {
        quizId_position: {
          quizId,
          position: question.position,
        },
      },
      select: { id: true },
    });
    if (conflict && conflict.id !== questionId) {
      return jsonError("A question already exists at this position", 409);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.option.deleteMany({ where: { questionId } });

    return tx.question.update({
      where: { id: questionId },
      data: {
        questionDescription: question.questionDescription,
        quesImgLink: question.quesImgLink ?? null,
        questionType: question.questionType,
        analyticsType: question.analyticsType,
        score: question.score,
        duration: question.duration,
        position: question.position,
        options: {
          create: options.map((option) => ({
            optionDescription: option.optionDescription,
            optImgLink: option.optImgLink ?? null,
            optionNature: option.optionNature,
          })),
        },
      },
      include: { options: true },
    });
  });

  return jsonOk({ question: updated });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id: quizId, questionId } = await context.params;
  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  const existing = await prisma.question.findFirst({
    where: { id: questionId, quizId },
    select: { id: true },
  });
  if (!existing) {
    return jsonError("Question not found", 404);
  }

  await prisma.question.delete({ where: { id: questionId } });
  return jsonOk({ success: true });
}
