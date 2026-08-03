import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Quiz } from "@/generated/prisma/client";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  error: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    details === undefined ? { error } : { error, details },
    { status },
  );
}

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { error: jsonError("Unauthorized", 401) as NextResponse };
  }
  return { session, userId: session.user.id };
}

export async function requireQuizOwner(
  quizId: string,
  userId: string,
): Promise<
  | { quiz: Quiz; error?: undefined }
  | { quiz?: undefined; error: NextResponse }
> {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    return { error: jsonError("Quiz not found", 404) };
  }
  if (quiz.userId !== userId) {
    return { error: jsonError("Forbidden", 403) };
  }
  return { quiz };
}
