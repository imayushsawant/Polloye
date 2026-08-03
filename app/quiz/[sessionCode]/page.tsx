"use client";

import {
  type CSSProperties,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import {
  connectWs,
  loadParticipantSession,
} from "@/lib/ws-client";

type PublicOption = {
  option_id: string;
  option_description: string;
  opt_img_link: string | null;
};

type PublicQuestion = {
  question_id: string;
  question_desc: string;
  question_type: string;
  score: number;
  duration: number;
  options: PublicOption[];
};

export default function QuizPlayPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: rawCode } = use(params);
  const sessionCode = rawCode.toUpperCase();
  const router = useRouter();

  const saved = useMemo(
    () => loadParticipantSession(sessionCode),
    [sessionCode],
  );

  const [socket, setSocket] = useState<Socket | null>(null);
  const [phase, setPhase] = useState("connecting");
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [optionCount, setOptionCount] = useState<Record<string, number> | null>(
    null,
  );
  const [attainedScore, setAttainedScore] = useState<number | null>(null);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ participant_name: string; total_score: number }>
  >([]);
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (!saved?.token) {
      router.replace(`/join-quiz/${sessionCode}`);
      return;
    }

    const s = connectWs(saved.token);
    setSocket(s);

    s.on("connect_error", (err) => setError(err.message));
    s.on("error", (payload: { message?: string }) =>
      setError(payload.message ?? "Socket error"),
    );
    s.on("session:state", (state: { phase: string; participant_count: number; current_question: PublicQuestion | null }) => {
      setPhase(state.phase);
      setParticipantCount(state.participant_count);
      if (state.current_question) {
        setQuestion(state.current_question);
      }
    });
    s.on("participant:count", (p: { participant_count: number }) =>
      setParticipantCount(p.participant_count),
    );
    s.on("question:reveal", (q: PublicQuestion) => {
      setPhase("question_active");
      setQuestion(q);
      setSelected([]);
      setSubmitted(false);
      setOptionCount(null);
      setAttainedScore(null);
      setCorrectIds([]);
      setLeaderboard([]);
    });
    s.on("options:count", (p: { optionCount: Record<string, number> }) =>
      setOptionCount(p.optionCount),
    );
    s.on(
      "answer:reveal",
      (p: { attainedScore: number; option_id: string[] }) => {
        setPhase("answer_revealed");
        setAttainedScore(p.attainedScore);
        setCorrectIds(p.option_id ?? []);
      },
    );
    s.on(
      "leaderboard:show",
      (p: {
        leaderboard: Array<{ participant_name: string; total_score: number }>;
        finished?: boolean;
      }) => {
        setPhase("leaderboard");
        setLeaderboard(p.leaderboard ?? []);
      },
    );
    s.on(
      "session:finished",
      (p: {
        leaderboard: Array<{ participant_name: string; total_score: number }>;
      }) => {
        setPhase("finished");
        setLeaderboard(p.leaderboard ?? []);
        router.push(`/result/${sessionCode}`);
      },
    );
    s.on("host:disconnected", () => setError("Host disconnected — quiz continues"));
    s.on("host:reconnected", () => setError(""));
    s.on("answer:accepted", () => setSubmitted(true));

    return () => {
      s.disconnect();
    };
  }, [saved?.token, sessionCode, router]);

  function toggleOption(optionId: string) {
    if (submitted || !question) return;
    if (question.question_type === "MSQ") {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
      return;
    }
    setSelected([optionId]);
  }

  function submitAnswer() {
    if (!socket || !question || submitted || selected.length === 0) return;
    socket.emit("answer:submit", {
      question_id: question.question_id,
      optionid: selected,
    });
  }

  if (!saved) {
    return <main style={page}>Redirecting to join…</main>;
  }

  return (
    <main style={page}>
      <h1>Live quiz</h1>
      <p>
        {saved.participantName} · {sessionCode} · {participantCount} players ·{" "}
        {phase}
      </p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {phase === "lobby" && <p>Waiting for host to show the first question…</p>}

      {question && phase === "question_active" && (
        <section style={card}>
          <h2>{question.question_desc}</h2>
          <p>
            {question.question_type} · {question.score} pts ·{" "}
            {question.duration}ms
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {question.options.map((opt) => (
              <button
                key={opt.option_id}
                type="button"
                onClick={() => toggleOption(opt.option_id)}
                disabled={submitted}
                style={{
                  textAlign: "left",
                  padding: 12,
                  border: selected.includes(opt.option_id)
                    ? "2px solid #222"
                    : "1px solid #ccc",
                }}
              >
                {opt.option_description}
                {submitted && optionCount
                  ? ` · ${optionCount[opt.option_id] ?? 0}`
                  : ""}
              </button>
            ))}
          </div>
          {!submitted ? (
            <button type="button" onClick={submitAnswer}>
              Submit
            </button>
          ) : (
            <p>Submitted — waiting for reveal. Live tallies update below.</p>
          )}
        </section>
      )}

      {phase === "answer_revealed" && (
        <section style={card}>
          <h2>Answer revealed</h2>
          <p>Your score this question: {attainedScore ?? 0}</p>
          <p>Correct option ids: {correctIds.join(", ")}</p>
        </section>
      )}

      {(phase === "leaderboard" || leaderboard.length > 0) && (
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
  maxWidth: 720,
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
