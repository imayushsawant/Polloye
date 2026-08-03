import type { Server, Socket } from "socket.io";
import { pool } from "./db.js";
import {
  buildOptionCounts,
  calculatePoints,
  publicQuestionPayload,
} from "./scoring.js";
import {
  clearSessionTimers,
  destroySession,
  getSessionByCode,
  roomName,
} from "./store.js";
import type { LiveSession, ParticipantJwt } from "./types.js";

const HOST_DISCONNECTED_REVEAL_MS = 60_000;
const HOST_DISCONNECTED_NEXT_MS = 30_000;

function emitParticipantCount(io: Server, session: LiveSession) {
  io.to(roomName(session.sessionCode)).emit("participant:count", {
    participant_count: session.participants.size,
  });
}

/**
 * Live tallies go only to the host and participants who already submitted.
 * Unanswered players must not see herd counts before locking in an answer.
 */
function emitOptionCounts(io: Server, session: LiveSession) {
  const question = session.questions[session.currentQuestionIndex];
  if (!question || session.phase !== "question_active") return;

  const payload = {
    question_id: question.id,
    optionCount: buildOptionCounts(
      question.options,
      session.activeResponses.values(),
    ),
  };

  if (session.hostSocketId) {
    io.to(session.hostSocketId).emit("options:count", payload);
  }

  for (const participantId of session.activeResponses.keys()) {
    const socketId = session.participantSockets.get(participantId);
    if (socketId) io.to(socketId).emit("options:count", payload);
  }
}

/** Host-connected auto-reveal uses remaining question.duration from questionShownAt. */
function scheduleHostConnectedReveal(io: Server, session: LiveSession) {
  clearSessionTimers(session);
  const question = session.questions[session.currentQuestionIndex];
  if (
    !question ||
    session.phase !== "question_active" ||
    session.questionShownAt == null
  ) {
    return;
  }

  const elapsed = Date.now() - session.questionShownAt;
  const remaining = Math.max(0, question.duration - elapsed);
  session.revealTimer = setTimeout(() => {
    void revealAnswer(io, session);
  }, remaining);
}

function leaderboardPayload(session: LiveSession) {
  return [...session.participants.entries()]
    .map(([participantId, p]) => ({
      participant_id: participantId,
      participant_name: p.name,
      total_score: p.totalScore,
    }))
    .sort((a, b) => b.total_score - a.total_score);
}

async function persistActiveResponses(session: LiveSession) {
  const question = session.questions[session.currentQuestionIndex];
  if (!question) return;

  const rows = [...session.activeResponses.values()];
  if (rows.length === 0) {
    session.activeResponses.clear();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(
        `INSERT INTO response (id, "optionIds", "questionId", "participantId", timestamp, "pointEarned")
         VALUES ($1, $2::text[], $3, $4, $5, $6)
         ON CONFLICT ("participantId", "questionId")
         DO UPDATE SET
           "optionIds" = EXCLUDED."optionIds",
           timestamp = EXCLUDED.timestamp,
           "pointEarned" = EXCLUDED."pointEarned"`,
        [
          crypto.randomUUID(),
          row.optionIds,
          question.id,
          row.participantId,
          new Date(row.submittedAt),
          row.pointEarned,
        ],
      );

      const total =
        session.participants.get(row.participantId)?.totalScore ?? 0;
      await client.query(
        `UPDATE participant SET "totalScore" = $1 WHERE id = $2`,
        [total, row.participantId],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  session.activeResponses.clear();
}

export async function revealAnswer(io: Server, session: LiveSession) {
  if (session.phase !== "question_active") return;
  clearSessionTimers(session);

  const question = session.questions[session.currentQuestionIndex];
  if (!question) return;

  const correctOptionIds = question.options
    .filter((o) => o.optionNature === "CORRECT")
    .map((o) => o.id);

  // Participants who never submitted get 0 (already implied — no response row yet;
  // we still emit 0 to their socket)
  for (const [participantId, socketId] of session.participantSockets) {
    const response = session.activeResponses.get(participantId);
    const attainedScore = response?.pointEarned ?? 0;
    io.to(socketId).emit("answer:reveal", {
      question_id: question.id,
      attainedScore,
      option_id: correctOptionIds,
    });
  }

  // Host also gets the reveal summary
  if (session.hostSocketId) {
    io.to(session.hostSocketId).emit("answer:reveal", {
      question_id: question.id,
      option_id: correctOptionIds,
      optionCount: buildOptionCounts(
        question.options,
        session.activeResponses.values(),
      ),
      leaderboard: leaderboardPayload(session),
    });
  }

  await persistActiveResponses(session);

  session.phase = "answer_revealed";
  session.questionsSinceLeaderboard += 1;
  session.blockedFromCurrentQuestion.clear();

  // Autonomous next when host disconnected
  if (!session.hostConnected) {
    if (session.questionsSinceLeaderboard >= 2) {
      session.nextTimer = setTimeout(() => {
        showLeaderboard(io, session);
        session.nextTimer = setTimeout(() => {
          void showNextQuestion(io, session);
        }, HOST_DISCONNECTED_NEXT_MS);
      }, HOST_DISCONNECTED_NEXT_MS);
    } else {
      session.nextTimer = setTimeout(() => {
        void showNextQuestion(io, session);
      }, HOST_DISCONNECTED_NEXT_MS);
    }
  }
}

export function showLeaderboard(io: Server, session: LiveSession) {
  clearSessionTimers(session);
  session.phase = "leaderboard";
  session.questionsSinceLeaderboard = 0;
  io.to(roomName(session.sessionCode)).emit("leaderboard:show", {
    leaderboard: leaderboardPayload(session),
    finished: session.currentQuestionIndex >= session.questions.length - 1,
  });
}

export async function showNextQuestion(io: Server, session: LiveSession) {
  clearSessionTimers(session);

  const nextIndex = session.currentQuestionIndex + 1;
  if (nextIndex >= session.questions.length) {
    await finishSession(io, session);
    return;
  }

  session.currentQuestionIndex = nextIndex;
  session.phase = "question_active";
  session.questionShownAt = Date.now();
  session.activeResponses.clear();
  // Anyone connecting after show is blocked for this question only if they join mid-question —
  // existing participants can answer.
  session.blockedFromCurrentQuestion.clear();

  await pool.query(
    `UPDATE quiz_session SET state = 'ACTIVE' WHERE id = $1`,
    [session.sessionId],
  );

  const question = session.questions[nextIndex];
  io.to(roomName(session.sessionCode)).emit(
    "question:reveal",
    publicQuestionPayload(question),
  );

  if (session.hostConnected) {
    scheduleHostConnectedReveal(io, session);
  } else {
    clearSessionTimers(session);
    session.revealTimer = setTimeout(() => {
      void revealAnswer(io, session);
    }, HOST_DISCONNECTED_REVEAL_MS);
  }
}

export async function finishSession(io: Server, session: LiveSession) {
  clearSessionTimers(session);
  session.phase = "finished";

  await pool.query(
    `UPDATE quiz_session SET state = 'FINISHED' WHERE id = $1`,
    [session.sessionId],
  );

  io.to(roomName(session.sessionCode)).emit("session:finished", {
    leaderboard: leaderboardPayload(session),
    session_code: session.sessionCode,
  });

  // Keep in memory briefly isn't required; destroy after broadcast
  destroySession(session.sessionId);
}

export function registerParticipantInMemory(
  session: LiveSession,
  participantId: string,
  name: string,
  totalScore = 0,
) {
  if (!session.participants.has(participantId)) {
    session.participants.set(participantId, {
      name,
      totalScore,
      joinedAt: Date.now(),
    });
  }
}

export function attachSocketHandlers(io: Server, socket: Socket) {
  const auth = socket.data.auth as
    | { role: "host"; sessionCode: string; userId: string; sessionId: string }
    | {
        role: "participant";
        sessionCode: string;
        participantId: string;
        participantName: string;
        sessionId: string;
      };

  const session = getSessionByCode(auth.sessionCode);
  if (!session) {
    socket.emit("error", { message: "Session not found in memory. Host must start again." });
    socket.disconnect(true);
    return;
  }

  const room = roomName(session.sessionCode);
  socket.join(room);

  if (auth.role === "host") {
    if (auth.userId !== session.hostUserId) {
      socket.emit("error", { message: "Not the host of this session" });
      socket.disconnect(true);
      return;
    }
    session.hostConnected = true;
    session.hostSocketId = socket.id;

    if (session.phase === "question_active") {
      // Drop the 60s autonomous timer and restore duration-based host control.
      scheduleHostConnectedReveal(io, session);
      emitOptionCounts(io, session);
    } else if (
      session.phase === "answer_revealed" ||
      session.phase === "leaderboard"
    ) {
      // Host is back — no autonomous next; they choose leaderboard / next.
      clearSessionTimers(session);
    }

    io.to(room).emit("host:reconnected", {});
    socket.emit("session:state", snapshotState(session));
  } else {
    const participantAuth = auth as ParticipantJwt & { role: "participant" };
    registerParticipantInMemory(
      session,
      participantAuth.participantId,
      participantAuth.participantName,
    );
    session.participantSockets.set(participantAuth.participantId, socket.id);

    // Mid-question reconnect: cannot answer the ongoing question
    if (session.phase === "question_active") {
      session.blockedFromCurrentQuestion.add(participantAuth.participantId);
      // Already-submitted players still get live tallies after reconnect
      if (session.activeResponses.has(participantAuth.participantId)) {
        emitOptionCounts(io, session);
      }
    }

    emitParticipantCount(io, session);
    socket.emit("session:state", snapshotState(session));
  }

  socket.on("host:showQuestion", async () => {
    if (auth.role !== "host") return;
    if (session.phase === "question_active") {
      socket.emit("error", { message: "A question is already active" });
      return;
    }
    await showNextQuestion(io, session);
  });

  socket.on("host:revealAnswer", async () => {
    if (auth.role !== "host") return;
    await revealAnswer(io, session);
  });

  socket.on("host:nextQuestion", async () => {
    if (auth.role !== "host") return;
    if (session.phase !== "answer_revealed" && session.phase !== "leaderboard") {
      socket.emit("error", { message: "Reveal the answer before advancing" });
      return;
    }
    await showNextQuestion(io, session);
  });

  socket.on("host:showLeaderboard", () => {
    if (auth.role !== "host") return;
    if (session.phase !== "answer_revealed" && session.phase !== "leaderboard") {
      socket.emit("error", { message: "Reveal the answer before leaderboard" });
      return;
    }
    showLeaderboard(io, session);
  });

  socket.on(
    "answer:submit",
    (payload: { question_id?: string; optionid?: string[] }) => {
      if (auth.role !== "participant") return;
      const participantId = auth.participantId;

      if (session.phase !== "question_active" || session.questionShownAt == null) {
        socket.emit("error", { message: "No active question" });
        return;
      }

      const question = session.questions[session.currentQuestionIndex];
      if (!question || payload.question_id !== question.id) {
        socket.emit("error", { message: "Question mismatch" });
        return;
      }

      // Cutoff: if reveal already happened, reject (phase check covers this)
      if (session.blockedFromCurrentQuestion.has(participantId)) {
        socket.emit("error", {
          message: "Cannot answer the current question after mid-question join/reconnect",
        });
        return;
      }

      // First response wins
      if (session.activeResponses.has(participantId)) {
        socket.emit("error", { message: "Already submitted" });
        return;
      }

      const optionIds = Array.isArray(payload.optionid) ? payload.optionid : [];
      const submittedAt = Date.now();
      const elapsedMs = submittedAt - session.questionShownAt;
      const pointEarned = calculatePoints({
        question,
        selectedOptionIds: optionIds,
        elapsedMs,
      });

      session.activeResponses.set(participantId, {
        participantId,
        optionIds,
        submittedAt,
        pointEarned,
      });

      const participant = session.participants.get(participantId);
      if (participant) {
        participant.totalScore += pointEarned;
      }

      socket.emit("answer:accepted", {
        question_id: question.id,
        // Score hidden from participant until reveal — still ack receipt
      });

      emitOptionCounts(io, session);
    },
  );

  socket.on("disconnect", () => {
    if (auth.role === "host") {
      if (session.hostSocketId === socket.id) {
        session.hostConnected = false;
        session.hostSocketId = null;
        io.to(room).emit("host:disconnected", {
          message: "Host disconnected. Quiz continues autonomously.",
        });

        // Switch to autonomous timers based on current phase
        if (session.phase === "question_active" && session.questionShownAt) {
          clearSessionTimers(session);
          const elapsed = Date.now() - session.questionShownAt;
          const remaining = Math.max(0, HOST_DISCONNECTED_REVEAL_MS - elapsed);
          session.revealTimer = setTimeout(() => {
            void revealAnswer(io, session);
          }, remaining);
        } else if (session.phase === "answer_revealed") {
          clearSessionTimers(session);
          session.nextTimer = setTimeout(() => {
            void showNextQuestion(io, session);
          }, HOST_DISCONNECTED_NEXT_MS);
        }
      }
    } else {
      // Keep participant record; only drop socket mapping if it's this socket
      if (session.participantSockets.get(auth.participantId) === socket.id) {
        session.participantSockets.delete(auth.participantId);
      }
      emitParticipantCount(io, session);
    }
  });
}

function snapshotState(session: LiveSession) {
  const question =
    session.currentQuestionIndex >= 0
      ? session.questions[session.currentQuestionIndex]
      : null;

  return {
    phase: session.phase,
    session_code: session.sessionCode,
    participant_count: session.participants.size,
    host_connected: session.hostConnected,
    current_question:
      question && session.phase === "question_active"
        ? publicQuestionPayload(question)
        : null,
    leaderboard:
      session.phase === "leaderboard" || session.phase === "finished"
        ? leaderboardPayload(session)
        : null,
  };
}
