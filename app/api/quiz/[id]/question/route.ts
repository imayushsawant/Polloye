import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { questionWithOptionsSchema } from "@/lib/validations/question";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id: quizId } = await context.params;
  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

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

  const existingPosition = await prisma.question.findUnique({
    where: {
      quizId_position: {
        quizId,
        position: question.position,
      },
    },
    select: { id: true },
  });
  if (existingPosition) {
    return jsonError("A question already exists at this position", 409);
  }

  const created = await prisma.question.create({
    data: {
      quizId,
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

  return jsonOk({ question: created }, 201);
}
