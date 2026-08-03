import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { generateUniqueQuizSharingCode } from "@/lib/codes";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ quizSharingCode: string }> };

/** Clone a shared quiz template for the logged-in user. */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { quizSharingCode } = await context.params;
  const source = await prisma.quiz.findUnique({
    where: { quizSharingCode: quizSharingCode.toUpperCase() },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: { options: true },
      },
    },
  });

  if (!source) return jsonError("Quiz not found", 404);

  const newSharingCode = await generateUniqueQuizSharingCode();

  const cloned = await prisma.quiz.create({
    data: {
      name: `${source.name} (copy)`,
      description: source.description,
      quizSharingCode: newSharingCode,
      userId: authResult.userId,
      questions: {
        create: source.questions.map((q) => ({
          questionDescription: q.questionDescription,
          quesImgLink: q.quesImgLink,
          questionType: q.questionType,
          analyticsType: q.analyticsType,
          score: q.score,
          duration: q.duration,
          position: q.position,
          options: {
            create: q.options.map((o) => ({
              optionDescription: o.optionDescription,
              optImgLink: o.optImgLink,
              optionNature: o.optionNature,
            })),
          },
        })),
      },
    },
    include: {
      questions: { include: { options: true } },
    },
  });

  return jsonOk({ quiz: cloned }, 201);
}

export async function GET(_request: Request, context: RouteContext) {
  const { quizSharingCode } = await context.params;
  const quiz = await prisma.quiz.findUnique({
    where: { quizSharingCode: quizSharingCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      description: true,
      quizSharingCode: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) return jsonError("Quiz not found", 404);
  return jsonOk({ quiz });
}
