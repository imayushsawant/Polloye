import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { auth } from "@/lib/auth";
import { generateUniqueQuizSharingCode } from "@/lib/codes";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ quizSharingCode: string }> };

const cloneBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name max length is 120")
    .optional(),
});

/** Clone a shared quiz into the logged-in user's account. */
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

  if (source.userId === authResult.userId) {
    return jsonError("You already own this quiz", 400);
  }

  let body: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
  }

  const parsed = cloneBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const name = parsed.data.name?.trim() || `${source.name} (copy)`;
  const newSharingCode = await generateUniqueQuizSharingCode();

  const cloned = await prisma.quiz.create({
    data: {
      name,
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
      _count: { select: { questions: true, sessions: true } },
    },
  });

  return jsonOk({ quiz: cloned }, 201);
}

export async function GET(request: Request, context: RouteContext) {
  const { quizSharingCode } = await context.params;
  const quiz = await prisma.quiz.findUnique({
    where: { quizSharingCode: quizSharingCode.toUpperCase() },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      quizSharingCode: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) return jsonError("Quiz not found", 404);

  const session = await auth.api.getSession({ headers: request.headers });
  const isOwner = Boolean(
    session?.user?.id && session.user.id === quiz.userId,
  );

  const { userId: _userId, ...publicQuiz } = quiz;
  return jsonOk({ quiz: publicQuiz, isOwner });
}
