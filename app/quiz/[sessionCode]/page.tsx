"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import {
  LeaderboardList,
  LobbyWaiting,
  OptionAnalytics,
  OptionGrid,
  RevealPopup,
  StatusBar,
  type LeaderboardRow,
  type PublicQuestion,
} from "@/components/live";
import { Badge, Button, Eyebrow } from "@/components/ui";
import {
  connectWs,
  loadParticipantSession,
} from "@/lib/ws-client";

const REVEAL_POPUP_MS = 2800;

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [showRevealPopup, setShowRevealPopup] = useState(false);

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
    s.on(
      "session:state",
      (state: {
        phase: string;
        participant_count: number;
        current_question: PublicQuestion | null;
        leaderboard?: LeaderboardRow[] | null;
        total_score?: number;
        rank?: number;
      }) => {
        setPhase(state.phase);
        setParticipantCount(state.participant_count);
        if (state.current_question) {
          setQuestion(state.current_question);
        }
        if (state.leaderboard) {
          setLeaderboard(state.leaderboard);
        }
        if (typeof state.total_score === "number") {
          setTotalScore(state.total_score);
        }
        if (typeof state.rank === "number") {
          setRank(state.rank);
        }
      },
    );
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
      setShowRevealPopup(false);
    });
    s.on("options:count", (p: { optionCount: Record<string, number> }) => {
      setOptionCount(p.optionCount);
      // Server only emits tallies to participants who already submitted
      setSubmitted(true);
    });
    s.on(
      "answer:reveal",
      (p: {
        attainedScore: number;
        option_id: string[];
        total_score?: number;
        rank?: number;
      }) => {
        setPhase("answer_revealed");
        setAttainedScore(p.attainedScore);
        setCorrectIds(p.option_id ?? []);
        if (typeof p.total_score === "number") setTotalScore(p.total_score);
        if (typeof p.rank === "number") setRank(p.rank);
        setShowRevealPopup(true);
      },
    );
    s.on(
      "leaderboard:show",
      (p: {
        leaderboard: LeaderboardRow[];
        finished?: boolean;
      }) => {
        setPhase("leaderboard");
        setLeaderboard(p.leaderboard ?? []);
        setShowRevealPopup(false);
      },
    );
    s.on(
      "session:finished",
      (p: { leaderboard: LeaderboardRow[] }) => {
        setPhase("finished");
        setLeaderboard(p.leaderboard ?? []);
        router.push(`/result/${sessionCode}`);
      },
    );
    s.on("host:disconnected", () =>
      setError("Host disconnected — quiz continues"),
    );
    s.on("host:reconnected", () => setError(""));
    s.on("answer:accepted", () => setSubmitted(true));

    return () => {
      s.disconnect();
    };
  }, [saved?.token, sessionCode, router]);

  useEffect(() => {
    if (!showRevealPopup) return;
    const id = window.setTimeout(() => {
      setShowRevealPopup(false);
    }, REVEAL_POPUP_MS);
    return () => window.clearTimeout(id);
  }, [showRevealPopup]);

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

  const isCorrectReveal =
    (attainedScore != null && attainedScore > 0) ||
    (selected.length > 0 &&
      correctIds.length === selected.length &&
      selected.every((id) => correctIds.includes(id)));

  if (!saved) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        <p className="text-body text-ink-muted">Redirecting to join…</p>
      </main>
    );
  }

  const showStatusBar = phase !== "connecting" && phase !== "finished";

  return (
    <main className="relative flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
        <Eyebrow tone="sage">Polloye</Eyebrow>
        <div className="flex items-center gap-2">
          <span className="text-mono text-ink-subtle">{sessionCode}</span>
          <Badge tone="phase">{phaseLabel(phase)}</Badge>
        </div>
      </header>

      {error && (
        <p className="text-caption mx-5 mb-2 rounded-md border border-semantic-error/30 bg-surface-1 px-3 py-2 text-semantic-error">
          {error}
        </p>
      )}

      {phase === "connecting" && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-body text-ink-muted">Connecting…</p>
        </div>
      )}

      {phase === "lobby" && (
        <LobbyWaiting
          sessionCode={sessionCode}
          participantName={saved.participantName}
          participantCount={participantCount}
        />
      )}

      {question && phase === "question_active" && (
        <section
          className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 pb-24 pt-4"
        >
          <div className="flex flex-col gap-2">
            <p className="text-mono m-0 text-ink-subtle">
              {question.question_type} · {question.score} pts
            </p>
            <h1 className="text-card-title m-0 sm:text-headline">
              {question.question_desc}
            </h1>
          </div>

          {!submitted ? (
            <>
              <OptionGrid
                options={question.options}
                selectedIds={selected}
                onToggle={toggleOption}
                disabled={submitted}
              />
              <Button
                variant="primary"
                className="w-full"
                disabled={selected.length === 0}
                onClick={submitAnswer}
              >
                Submit
              </Button>
            </>
          ) : (
            <>
              <OptionAnalytics
                options={question.options}
                optionCount={optionCount ?? {}}
                analyticsType={question.analytics_type}
              />
              <p className="text-body-sm m-0 text-center text-ink-muted">
                Locked in — tallies update live
              </p>
            </>
          )}
        </section>
      )}

      {phase === "answer_revealed" && !showRevealPopup && (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
          <Eyebrow>Answer revealed</Eyebrow>
          <h2 className="text-headline m-0">Waiting for host…</h2>
          <p className="text-body-sm m-0 text-ink-muted">
            {attainedScore != null
              ? `You scored ${attainedScore} this round`
              : "Hang tight for the next step"}
          </p>
        </div>
      )}

      {phase === "leaderboard" && (
        <section className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 pb-24 pt-4">
          <div>
            <Eyebrow>Live standings</Eyebrow>
            <h2 className="text-headline m-0 mt-2">Leaderboard</h2>
          </div>
          <LeaderboardList
            rows={leaderboard}
            highlightName={saved.participantName}
          />
        </section>
      )}

      <RevealPopup
        open={showRevealPopup && phase === "answer_revealed"}
        correct={Boolean(isCorrectReveal)}
        attainedScore={attainedScore ?? 0}
      />

      {showStatusBar && <StatusBar rank={rank} totalScore={totalScore} />}
    </main>
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "lobby":
      return "Lobby";
    case "question_active":
      return "Live";
    case "answer_revealed":
      return "Revealed";
    case "leaderboard":
      return "Board";
    case "connecting":
      return "Connecting";
    default:
      return phase;
  }
}
