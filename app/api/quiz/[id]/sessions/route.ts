import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Sessions for a quiz the current user owns (newest first). */
export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id } = await context.params;
  const ownership = await requireQuizOwner(id, authResult.userId);
  if (ownership.error) return ownership.error;

  try {
    const sessions = await prisma.quizSession.findMany({
      where: { quizId: id },
      orderBy: { conductedAt: "desc" },
      include: {
        _count: { select: { participants: true } },
      },
    });

    const sorted = [...sessions].sort((a, b) => {
      const aTime = (a.startedAt ?? a.conductedAt).getTime();
      const bTime = (b.startedAt ?? b.conductedAt).getTime();
      return bTime - aTime;
    });

    return jsonOk({
      sessions: sorted.map((s) => ({
        id: s.id,
        sessionCode: s.sessionCode,
        state: s.state,
        conductedAt: s.conductedAt.toISOString(),
        startedAt: (s.startedAt ?? s.conductedAt).toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        participantCount: s._count.participants,
      })),
    });
  } catch (err) {
    console.error("quiz_sessions_list_failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Failed to load sessions",
      500,
    );
  }
}
