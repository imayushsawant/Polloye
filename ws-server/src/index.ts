import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { verifyWsToken } from "./auth.js";
import { attachSocketHandlers } from "./lifecycle.js";
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
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

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
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, sessionCode: body.sessionCode }));
    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/internal/sessions/") && req.url.endsWith("/participants")) {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const code = decodeURIComponent(
      req.url.replace("/internal/sessions/", "").replace("/participants", ""),
    );
    const session = getSessionByCode(code);
    if (!session) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

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
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        participant_count: session.participants.size,
      }),
    );
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/internal/sessions/")) {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
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
      next(new Error("Missing auth token"));
      return;
    }

    const payload = await verifyWsToken(token);
    socket.data.auth = payload;
    next();
  } catch {
    next(new Error("Invalid auth token"));
  }
});

io.on("connection", (socket) => {
  attachSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`WS server listening on http://localhost:${PORT}`);
});
