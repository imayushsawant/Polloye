import { requireSession, jsonError, jsonOk } from "@/lib/api";
import { generateUniqueQuizSharingCode } from "@/lib/codes";
import { prisma } from "@/lib/prisma";
import { createQuizSchema } from "@/lib/validations/quiz";

export async function GET(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const quizzes = await prisma.quiz.findMany({
    where: { userId: authResult.userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true, sessions: true } },
    },
  });

  return jsonOk({ quizzes });
}

export async function POST(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const quizSharingCode = await generateUniqueQuizSharingCode();

  const quiz = await prisma.quiz.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      quizSharingCode,
      userId: authResult.userId,
    },
  });

  return jsonOk({ quiz }, 201);
}
