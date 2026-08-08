"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import {
  LeaderboardList,
  LobbyWaiting,
  OptionAnalytics,
  OptionGrid,
  type LeaderboardRow,
  type PublicQuestion,
} from "@/components/live";
import { Badge, Button, Eyebrow, cx } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { connectWs } from "@/lib/ws-client";

function hostTokenStorageKey(sessionCode: string) {
  return `polloye:host:${sessionCode.toUpperCase()}`;
}

type HostMode = "present" | "controls";

/** Live host — Present (projector) + Controls (phase actions). */
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
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [optionCount, setOptionCount] = useState<Record<string, number> | null>(
    null,
  );
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [mode, setMode] = useState<HostMode>("present");
  const [copied, setCopied] = useState(false);

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
            current_question: PublicQuestion | null;
            leaderboard?: LeaderboardRow[] | null;
          }) => {
            setPhase(state.phase);
            setParticipantCount(state.participant_count);
            if (state.current_question) setQuestion(state.current_question);
            if (state.leaderboard) setLeaderboard(state.leaderboard);
          },
        );
        s.on("participant:count", (p: { participant_count: number }) =>
          setParticipantCount(p.participant_count),
        );
        s.on("question:reveal", (q: PublicQuestion) => {
          setPhase("question_active");
          setQuestion(q);
          setOptionCount(null);
          setCorrectIds([]);
          setLeaderboard([]);
        });
        s.on("options:count", (p: { optionCount: Record<string, number> }) =>
          setOptionCount(p.optionCount),
        );
        s.on(
          "answer:reveal",
          (p: {
            option_id?: string[];
            optionCount?: Record<string, number>;
            leaderboard?: LeaderboardRow[];
          }) => {
            setPhase("answer_revealed");
            if (p.option_id) setCorrectIds(p.option_id);
            if (p.optionCount) setOptionCount(p.optionCount);
            if (p.leaderboard) setLeaderboard(p.leaderboard);
          },
        );
        s.on(
          "leaderboard:show",
          (p: { leaderboard: LeaderboardRow[] }) => {
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

  async function copyJoinUrl() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  if (isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <p className="text-body text-ink-muted">Loading…</p>
      </main>
    );
  }

  const showRevealMarking =
    phase === "answer_revealed" || phase === "leaderboard";
  const tallies = optionCount ?? {};

  return (
    <main className="relative flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Eyebrow tone="sage">Polloye</Eyebrow>
          <span className="text-mono text-ink-subtle">{sessionCode}</span>
          <Badge tone="phase">{hostPhaseLabel(phase)}</Badge>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>

      {error && (
        <p className="text-caption mx-5 mb-2 rounded-md border border-semantic-error/30 bg-surface-1 px-3 py-2 text-semantic-error">
          {error}
        </p>
      )}

      {mode === "present" ? (
        <div
          className={cx(
            "mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pt-4",
            "pb-28",
          )}
        >
          {(phase === "lobby" || phase === "connecting") && (
            <LobbyWaiting
              sessionCode={sessionCode}
              participantName="Host"
              participantCount={participantCount}
              variant="host"
            />
          )}

          {question &&
            (phase === "question_active" ||
              phase === "answer_revealed") && (
              <section className="flex flex-1 flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <p className="text-mono m-0 text-ink-subtle">
                    {question.question_type} · {question.score} pts
                  </p>
                  <h1 className="text-headline m-0 sm:text-display-md">
                    {question.question_desc}
                  </h1>
                </div>

                <OptionGrid
                  options={question.options}
                  selectedIds={[]}
                  onToggle={() => {}}
                  disabled
                  correctIds={correctIds}
                  showCorrect={showRevealMarking}
                />

                <OptionAnalytics
                  options={question.options}
                  optionCount={tallies}
                  analyticsType={question.analytics_type}
                  correctIds={correctIds}
                  showCorrect={showRevealMarking}
                />
              </section>
            )}

          {phase === "leaderboard" && (
            <section className="flex flex-1 flex-col gap-6">
              <div>
                <Eyebrow>Live standings</Eyebrow>
                <h2 className="text-headline m-0 mt-2 sm:text-display-md">
                  Leaderboard
                </h2>
              </div>
              <LeaderboardList rows={leaderboard} />
            </section>
          )}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 pb-10 pt-4">
          <section className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface-1 p-5">
            <p className="text-eyebrow m-0 text-ink-muted">Session</p>
            <p className="text-mono m-0 text-ink">{sessionCode}</p>
            <p className="text-body-sm m-0 text-ink-muted">
              {participantCount}{" "}
              {participantCount === 1 ? "player" : "players"} · {hostPhaseLabel(phase)}
            </p>
            <p className="text-body-sm m-0 break-all text-ink-subtle">
              {joinUrl || "…"}
            </p>
            <Button variant="secondary" size="sm" onClick={copyJoinUrl}>
              {copied ? "Copied" : "Copy join link"}
            </Button>
          </section>

          {question && (
            <section className="flex flex-col gap-3">
              <p className="text-body-sm m-0 line-clamp-3 text-ink">
                {question.question_desc}
              </p>
              {(phase === "question_active" ||
                phase === "answer_revealed") && (
                <OptionAnalytics
                  options={question.options}
                  optionCount={tallies}
                  analyticsType={question.analytics_type}
                  correctIds={correctIds}
                  showCorrect={showRevealMarking}
                  className="mt-1"
                />
              )}
            </section>
          )}

          <HostPhaseActions
            phase={phase}
            socket={socket}
          />

          {phase === "leaderboard" && leaderboard.length > 0 && (
            <LeaderboardList rows={leaderboard} compact />
          )}
        </div>
      )}

      {/* Present mode: persistent phase strip */}
      {mode === "present" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface-1 px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-mono m-0 text-ink-subtle">
              {participantCount}{" "}
              {participantCount === 1 ? "player" : "players"}
            </p>
            <HostPhaseActions phase={phase} socket={socket} compact />
          </div>
        </div>
      )}
    </main>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: HostMode;
  onChange: (m: HostMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-pill bg-surface-2 p-0.5"
      role="group"
      aria-label="Host view mode"
    >
      {(["present", "controls"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cx(
            "rounded-pill px-3.5 py-1.5 text-caption font-medium capitalize transition-colors",
            "min-h-9 cursor-pointer",
            mode === m
              ? "bg-surface-1 text-ink"
              : "bg-transparent text-ink-muted",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function HostPhaseActions({
  phase,
  socket,
  compact = false,
}: {
  phase: string;
  socket: Socket | null;
  compact?: boolean;
}) {
  const btnClass = compact ? undefined : "w-full sm:w-auto";

  return (
    <div className={cx("flex flex-wrap gap-2", !compact && "flex-col sm:flex-row")}>
      {(phase === "lobby" || phase === "connecting") && (
        <Button
          variant="primary"
          size={compact ? "sm" : "md"}
          className={btnClass}
          disabled={!socket || phase === "connecting"}
          onClick={() => socket?.emit("host:showQuestion")}
        >
          Show first question
        </Button>
      )}
      {phase === "question_active" && (
        <Button
          variant="primary"
          size={compact ? "sm" : "md"}
          className={btnClass}
          disabled={!socket}
          onClick={() => socket?.emit("host:revealAnswer")}
        >
          Reveal answer
        </Button>
      )}
      {phase === "answer_revealed" && (
        <>
          <Button
            variant="secondary"
            size={compact ? "sm" : "md"}
            className={btnClass}
            disabled={!socket}
            onClick={() => socket?.emit("host:showLeaderboard")}
          >
            Show leaderboard
          </Button>
          <Button
            variant="primary"
            size={compact ? "sm" : "md"}
            className={btnClass}
            disabled={!socket}
            onClick={() => socket?.emit("host:nextQuestion")}
          >
            Next question
          </Button>
        </>
      )}
      {phase === "leaderboard" && (
        <Button
          variant="primary"
          size={compact ? "sm" : "md"}
          className={btnClass}
          disabled={!socket}
          onClick={() => socket?.emit("host:nextQuestion")}
        >
          Next question
        </Button>
      )}
    </div>
  );
}

function hostPhaseLabel(phase: string): string {
  switch (phase) {
    case "lobby":
      return "Lobby";
    case "question_active":
      return "Question";
    case "answer_revealed":
      return "Revealed";
    case "leaderboard":
      return "Leaderboard";
    case "connecting":
      return "Connecting";
    default:
      return phase;
  }
}
