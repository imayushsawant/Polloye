import { requireSession, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  try {
    const rows = await prisma.participant.findMany({
      where: { userId: authResult.userId },
      orderBy: { session: { conductedAt: "desc" } },
      include: {
        session: {
          include: {
            quiz: {
              select: { id: true, name: true, description: true },
            },
          },
        },
      },
    });

    return jsonOk({
      participated: rows.map((p) => ({
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
    });
  } catch {
    return jsonError("Failed to load participated quizzes", 500);
  }
}
