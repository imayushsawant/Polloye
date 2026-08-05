"use client";

import {
  type CSSProperties,
  use,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import { authClient } from "@/lib/auth-client";
import { connectWs } from "@/lib/ws-client";

function hostTokenStorageKey(sessionCode: string) {
  return `polloye:host:${sessionCode.toUpperCase()}`;
}

/** Live host controls after Begin — quiz is already in WS memory. */
export default function LiveHostPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: rawCode } = use(params);
  const sessionCode = rawCode.toUpperCase();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [phase, setPhase] = useState("connecting");
  const [participantCount, setParticipantCount] = useState(0);
  const [question, setQuestion] = useState<{
    question_id: string;
    question_desc: string;
    duration: number;
  } | null>(null);
  const [optionCount, setOptionCount] = useState<Record<string, number> | null>(
    null,
  );
  const [leaderboard, setLeaderboard] = useState<
    Array<{ participant_name: string; total_score: number }>
  >([]);
  const [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join-quiz/${sessionCode}`);
  }, [sessionCode]);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }

    let active = true;
    let s: Socket | null = null;

    async function boot() {
      try {
        // Ensure lobby was begun (quiz in WS memory)
        const statusRes = await fetch(`/api/session/${sessionCode}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          setError(statusData.error ?? "Session not found");
          return;
        }
        if (statusData.session.state === "INACTIVE") {
          router.replace(`/join-quiz/${sessionCode}/host`);
          return;
        }

        let token = sessionStorage.getItem(hostTokenStorageKey(sessionCode));
        if (!token) {
          const res = await fetch(`/api/join-quiz/${sessionCode}/host-token`, {
            method: "POST",
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Failed to mint host token");
            return;
          }
          token = data.token as string;
          sessionStorage.setItem(hostTokenStorageKey(sessionCode), token);
        }
        if (!active || !token) return;

        s = connectWs(token);
        setSocket(s);

        s.on("connect_error", (err) => setError(err.message));
        s.on("error", (payload: { message?: string }) =>
          setError(payload.message ?? "Socket error"),
        );
        s.on(
          "session:state",
          (state: {
            phase: string;
            participant_count: number;
            current_question: {
              question_id: string;
              question_desc: string;
              duration: number;
            } | null;
          }) => {
            setPhase(state.phase);
            setParticipantCount(state.participant_count);
            setQuestion(state.current_question);
          },
        );
        s.on("participant:count", (p: { participant_count: number }) =>
          setParticipantCount(p.participant_count),
        );
        s.on(
          "question:reveal",
          (q: {
            question_id: string;
            question_desc: string;
            duration: number;
          }) => {
            setPhase("question_active");
            setQuestion(q);
            setOptionCount(null);
            setLeaderboard([]);
          },
        );
        s.on("options:count", (p: { optionCount: Record<string, number> }) =>
          setOptionCount(p.optionCount),
        );
        s.on(
          "answer:reveal",
          (p: {
            optionCount?: Record<string, number>;
            leaderboard?: Array<{
              participant_name: string;
              total_score: number;
            }>;
          }) => {
            setPhase("answer_revealed");
            if (p.optionCount) setOptionCount(p.optionCount);
            if (p.leaderboard) setLeaderboard(p.leaderboard);
          },
        );
        s.on(
          "leaderboard:show",
          (p: {
            leaderboard: Array<{
              participant_name: string;
              total_score: number;
            }>;
          }) => {
            setPhase("leaderboard");
            setLeaderboard(p.leaderboard ?? []);
          },
        );
        s.on("session:finished", () => {
          setPhase("finished");
          router.push(`/result/${sessionCode}`);
        });
      } catch {
        setError("Host boot failed");
      }
    }

    void boot();
    return () => {
      active = false;
      s?.disconnect();
    };
  }, [isPending, session, sessionCode, router]);

  if (isPending) return <main style={page}>Loading…</main>;

  return (
    <main style={page}>
      <h1>Live host · {sessionCode}</h1>
      <p>
        Phase: {phase} · Players: {participantCount}
      </p>
      <p>
        Lobby link: <Link href={joinUrl}>{joinUrl || "…"}</Link>
      </p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {question && (
        <section style={card}>
          <h2>{question.question_desc}</h2>
          <p>Duration {question.duration}ms</p>
          {optionCount && (
            <pre style={{ margin: 0 }}>
              {JSON.stringify(optionCount, null, 2)}
            </pre>
          )}
        </section>
      )}

      <section style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(phase === "lobby" || phase === "connecting") && (
          <button
            type="button"
            disabled={!socket || phase === "connecting"}
            onClick={() => socket?.emit("host:showQuestion")}
          >
            Show first question
          </button>
        )}
        {phase === "question_active" && (
          <button
            type="button"
            disabled={!socket}
            onClick={() => socket?.emit("host:revealAnswer")}
          >
            Reveal answer
          </button>
        )}
        {phase === "answer_revealed" && (
          <>
            <button
              type="button"
              disabled={!socket}
              onClick={() => socket?.emit("host:showLeaderboard")}
            >
              Show leaderboard
            </button>
            <button
              type="button"
              disabled={!socket}
              onClick={() => socket?.emit("host:nextQuestion")}
            >
              Next question
            </button>
          </>
        )}
        {phase === "leaderboard" && (
          <button
            type="button"
            disabled={!socket}
            onClick={() => socket?.emit("host:nextQuestion")}
          >
            Next question
          </button>
        )}
      </section>

      {phase === "leaderboard" && leaderboard.length > 0 && (
        <section style={card}>
          <h2>Leaderboard</h2>
          <ol>
            {leaderboard.map((row, i) => (
              <li key={`${row.participant_name}-${i}`}>
                {row.participant_name}: {row.total_score}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 800,
  margin: "24px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  display: "grid",
  gap: 12,
};
