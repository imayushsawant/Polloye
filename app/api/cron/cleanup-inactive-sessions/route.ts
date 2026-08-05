import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * Deletes INACTIVE quiz sessions older than 24 hours.
 * Protect with Authorization: Bearer $CRON_SECRET (or ?secret=).
 *
 * Example (every hour): curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://your-app/api/cron/cleanup-inactive-sessions
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError("CRON_SECRET is not configured", 503);
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (bearer !== secret && querySecret !== secret) {
    return jsonError("Unauthorized", 401);
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.quizSession.deleteMany({
      where: {
        state: "INACTIVE",
        conductedAt: { lt: cutoff },
      },
    });

    return jsonOk({
      deleted: result.count,
      olderThan: cutoff.toISOString(),
    });
  } catch {
    return jsonError("Cleanup failed", 500);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
