import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { verifyWsToken } from "./auth.js";
import { attachSocketHandlers } from "./lifecycle.js";
import { startInactiveSessionCron } from "./cleanup.js";
import { logger } from "./logger.js";
import { bootstrapSession, getSessionByCode } from "./store.js";
import type { LiveQuestion } from "./types.js";

const PORT = Number(process.env.WS_PORT ?? 3001);
const INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

if (!process.env.WS_JWT_SECRET) {
  throw new Error("WS_JWT_SECRET is required");
}
if (!INTERNAL_SECRET) {
  throw new Error("WS_INTERNAL_SECRET is required");
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && req.url === "/internal/sessions/bootstrap") {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      logger.error("internal_auth_failed", { route: "bootstrap" });
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        sessionId: string;
        sessionCode: string;
        quizId: string;
        hostUserId: string;
        questions: LiveQuestion[];
      };

      bootstrapSession(body);
      logger.info("session_bootstrapped", {
        sessionId: body.sessionId,
        sessionCode: body.sessionCode,
        quizId: body.quizId,
        questionCount: body.questions?.length ?? 0,
      });
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, sessionCode: body.sessionCode }));
    } catch (err) {
      logger.error("session_bootstrap_failed", {
        err: err instanceof Error ? err.message : "unknown",
      });
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  if (
    req.method === "POST" &&
    req.url?.startsWith("/internal/sessions/") &&
    req.url.endsWith("/participants")
  ) {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      logger.error("internal_auth_failed", { route: "participants" });
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const code = decodeURIComponent(
      req.url.replace("/internal/sessions/", "").replace("/participants", ""),
    );
    const session = getSessionByCode(code);
    if (!session) {
      logger.warn("participant_register_missing_session", {
        sessionCode: code,
      });
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        participantId: string;
        participantName: string;
        totalScore?: number;
      };

      if (!session.participants.has(body.participantId)) {
        session.participants.set(body.participantId, {
          name: body.participantName,
          totalScore: body.totalScore ?? 0,
          joinedAt: Date.now(),
        });
        logger.info("participant_registered_memory", {
          sessionId: session.sessionId,
          sessionCode: session.sessionCode,
          participantId: body.participantId,
        });
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          participant_count: session.participants.size,
        }),
      );
    } catch (err) {
      logger.error("participant_register_failed", {
        sessionCode: code,
        err: err instanceof Error ? err.message : "unknown",
      });
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/internal/sessions/")) {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      logger.error("internal_auth_failed", { route: "session_get" });
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const code = decodeURIComponent(req.url.replace("/internal/sessions/", ""));
    const session = getSessionByCode(code);
    res.writeHead(session ? 200 : 404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        session
          ? {
              sessionId: session.sessionId,
              phase: session.phase,
              participantCount: session.participants.size,
            }
          : { error: "Not found" },
      ),
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.use(async (socket, next) => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers["x-ws-token"] as string | undefined);

    if (!token) {
      logger.error("jwt_missing", { socketId: socket.id });
      next(new Error("Missing auth token"));
      return;
    }

    const payload = await verifyWsToken(token);
    socket.data.auth = payload;
    logger.debug("jwt_verified", {
      socketId: socket.id,
      role: payload.role,
      sessionId: payload.sessionId,
      sessionCode: payload.sessionCode,
      ...(payload.role === "host"
        ? { userId: payload.userId }
        : { participantId: payload.participantId }),
    });
    next();
  } catch (err) {
    logger.error("jwt_invalid", {
      socketId: socket.id,
      err: err instanceof Error ? err.message : "unknown",
    });
    next(new Error("Invalid auth token"));
  }
});

io.on("connection", (socket) => {
  const auth = socket.data.auth as
    | { role: string; sessionId?: string; sessionCode?: string }
    | undefined;
  logger.info("socket_connected", {
    socketId: socket.id,
    role: auth?.role,
    sessionId: auth?.sessionId,
    sessionCode: auth?.sessionCode,
  });
  attachSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  logger.info("ws_server_listening", { port: PORT });
  startInactiveSessionCron();
});
