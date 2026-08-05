import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { bootstrapWsSession } from "@/lib/ws-bootstrap";

type RouteContext = { params: Promise<{ sessionCode: string }> };

/**
 * Host presses Begin in the waiting room:
 * load full quiz into WS memory, mark session ACTIVE, sync joined participants.
 */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { sessionCode } = await context.params;
  const session = await prisma.quizSession.findUnique({
    where: { sessionCode: sessionCode.toUpperCase() },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { options: true },
          },
        },
      },
      participants: {
        select: {
          id: true,
          participantName: true,
          totalScore: true,
        },
      },
    },
  });

  if (!session) return jsonError("Session not found", 404);
  if (session.quiz.userId !== authResult.userId) {
    return jsonError("Forbidden", 403);
  }
  if (session.state === "FINISHED") {
    return jsonError("Session already finished", 400);
  }
  if (session.quiz.questions.length === 0) {
    return jsonError("Quiz has no questions", 400);
  }

  try {
    await bootstrapWsSession({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      quizId: session.quizId,
      hostUserId: authResult.userId,
      questions: session.quiz.questions.map((q) => ({
        id: q.id,
        questionDescription: q.questionDescription,
        quesImgLink: q.quesImgLink,
        questionType: q.questionType,
        analyticsType: q.analyticsType,
        score: q.score,
        duration: q.duration,
        position: q.position,
        options: q.options.map((o) => ({
          id: o.id,
          optionDescription: o.optionDescription,
          optImgLink: o.optImgLink,
          optionNature: o.optionNature,
        })),
      })),
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load quiz onto WS server",
      502,
    );
  }

  // Mirror anyone who already joined the lobby into WS memory
  const baseUrl = process.env.WS_SERVER_URL ?? "http://localhost:3001";
  const secret = process.env.WS_INTERNAL_SECRET;
  if (secret) {
    await Promise.all(
      session.participants.map((p) =>
        fetch(
          `${baseUrl}/internal/sessions/${encodeURIComponent(session.sessionCode)}/participants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({
              participantId: p.id,
              participantName: p.participantName,
              totalScore: p.totalScore,
            }),
          },
        ).catch(() => undefined),
      ),
    );
  }

  const updated = await prisma.quizSession.update({
    where: { id: session.id },
    data: {
      state: "ACTIVE",
      startedAt: session.startedAt ?? new Date(),
    },
  });

  return jsonOk({ session: updated });
}
