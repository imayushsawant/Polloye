import type { LiveQuestion, LiveSession } from "./types.js";

const sessions = new Map<string, LiveSession>();
const byCode = new Map<string, string>();

export function getSessionByCode(sessionCode: string) {
  const id = byCode.get(sessionCode);
  if (!id) return undefined;
  return sessions.get(id);
}

export function getSessionById(sessionId: string) {
  return sessions.get(sessionId);
}

export function bootstrapSession(input: {
  sessionId: string;
  sessionCode: string;
  quizId: string;
  hostUserId: string;
  questions: LiveQuestion[];
}): LiveSession {
  const existing = sessions.get(input.sessionId);
  if (existing) {
    clearSessionTimers(existing);
  }

  const sorted = [...input.questions].sort((a, b) => a.position - b.position);

  const session: LiveSession = {
    sessionId: input.sessionId,
    sessionCode: input.sessionCode,
    quizId: input.quizId,
    hostUserId: input.hostUserId,
    questions: sorted,
    phase: "lobby",
    currentQuestionIndex: -1,
    hostConnected: false,
    hostSocketId: null,
    participantSockets: new Map(),
    participants: new Map(),
    activeResponses: new Map(),
    blockedFromCurrentQuestion: new Set(),
    questionShownAt: null,
    questionsSinceLeaderboard: 0,
    revealTimer: null,
    nextTimer: null,
  };

  sessions.set(session.sessionId, session);
  byCode.set(session.sessionCode, session.sessionId);
  return session;
}

export function clearSessionTimers(session: LiveSession) {
  if (session.revealTimer) {
    clearTimeout(session.revealTimer);
    session.revealTimer = null;
  }
  if (session.nextTimer) {
    clearTimeout(session.nextTimer);
    session.nextTimer = null;
  }
}

export function destroySession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  clearSessionTimers(session);
  byCode.delete(session.sessionCode);
  sessions.delete(sessionId);
}

export function roomName(sessionCode: string) {
  return `session:${sessionCode}`;
}
