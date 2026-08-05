import { requireSession, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const userId = authResult.userId;

  try {
    const [quizzes, participated, conducted] = await Promise.all([
      prisma.quiz.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { questions: true, sessions: true } },
        },
      }),
      prisma.participant.findMany({
        where: { userId },
        orderBy: { session: { conductedAt: "desc" } },
        take: 40,
        include: {
          session: {
            include: {
              quiz: {
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
      }),
      prisma.quizSession.findMany({
        where: { quiz: { userId } },
        orderBy: { conductedAt: "desc" },
        take: 40,
        include: {
          quiz: { select: { id: true, name: true } },
          _count: { select: { participants: true } },
        },
      }),
    ]);

    return jsonOk({
      quizzes,
      participated: participated.map((p) => ({
        id: p.id,
        participantName: p.participantName,
        totalScore: p.totalScore,
        session: {
          id: p.session.id,
          sessionCode: p.session.sessionCode,
          state: p.session.state,
          conductedAt: p.session.conductedAt,
        },
        quiz: p.session.quiz,
      })),
      conducted: conducted.map((s) => ({
        id: s.id,
        sessionCode: s.sessionCode,
        state: s.state,
        conductedAt: s.conductedAt,
        participantCount: s._count.participants,
        quiz: s.quiz,
      })),
    });
  } catch {
    return jsonError("Failed to load dashboard", 500);
  }
}
