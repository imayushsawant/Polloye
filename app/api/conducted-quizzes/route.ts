import { requireSession, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  try {
    const rows = await prisma.quizSession.findMany({
      where: {
        state: "FINISHED",
        quiz: { userId: authResult.userId },
      },
      orderBy: [{ startedAt: "desc" }, { conductedAt: "desc" }],
      include: {
        quiz: { select: { id: true, name: true } },
        participants: {
          orderBy: { totalScore: "desc" },
          take: 10,
          select: {
            id: true,
            participantName: true,
            totalScore: true,
          },
        },
        _count: { select: { participants: true } },
      },
    });

    return jsonOk({
      conducted: rows.map((s) => {
        const start = s.startedAt ?? s.conductedAt;
        const end = s.endedAt;
        const durationMs =
          end != null ? Math.max(0, end.getTime() - start.getTime()) : null;

        return {
          id: s.id,
          sessionCode: s.sessionCode,
          quiz: s.quiz,
          participantCount: s._count.participants,
          startedAt: start.toISOString(),
          endedAt: end?.toISOString() ?? null,
          durationMs,
          topLeaderboard: s.participants,
        };
      }),
    });
  } catch {
    return jsonError("Failed to load conducted quizzes", 500);
  }
}
