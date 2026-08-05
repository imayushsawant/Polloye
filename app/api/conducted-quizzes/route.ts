import { requireSession, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  try {
    const rows = await prisma.quizSession.findMany({
      where: { quiz: { userId: authResult.userId } },
      orderBy: { conductedAt: "desc" },
      include: {
        quiz: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });

    return jsonOk({
      conducted: rows.map((s) => ({
        id: s.id,
        sessionCode: s.sessionCode,
        state: s.state,
        conductedAt: s.conductedAt,
        participantCount: s._count.participants,
        quiz: s.quiz,
      })),
    });
  } catch {
    return jsonError("Failed to load conducted quizzes", 500);
  }
}
