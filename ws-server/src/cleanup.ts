import { pool } from "./db.js";
import { logger } from "./logger.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Deletes INACTIVE lobby sessions older than 24 hours.
 * Runs on an interval from the WS process (primary cron for self-host).
 */
export async function cleanupInactiveSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - DAY_MS);
  const result = await pool.query(
    `DELETE FROM quiz_session
     WHERE state = 'INACTIVE' AND "conductedAt" < $1`,
    [cutoff],
  );
  const deleted = result.rowCount ?? 0;
  if (deleted > 0) {
    logger.info("inactive_sessions_cleaned", {
      deleted,
      olderThan: cutoff.toISOString(),
    });
  }
  return deleted;
}

export function startInactiveSessionCron() {
  void cleanupInactiveSessions().catch((err) => {
    logger.error("inactive_session_cleanup_failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
  });

  const timer = setInterval(() => {
    void cleanupInactiveSessions().catch((err) => {
      logger.error("inactive_session_cleanup_failed", {
        err: err instanceof Error ? err.message : "unknown",
      });
    });
  }, HOUR_MS);

  timer.unref?.();
  return timer;
}
