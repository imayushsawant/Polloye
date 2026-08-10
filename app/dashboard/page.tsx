"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { JoinQuizModal } from "@/components/join-quiz-modal";
import {
  OnboardingWalkthrough,
  shouldShowOnboarding,
} from "@/components/onboarding-walkthrough";
import {
  Badge,
  Button,
  EmptyState,
  Eyebrow,
  cx,
} from "@/components/ui";

type QuizRow = {
  id: string;
  name: string;
  description: string | null;
  quizSharingCode: string;
  createdAt: string;
  _count: { questions: number; sessions: number };
};

type ParticipatedRow = {
  id: string;
  participantName: string;
  totalScore: number;
  session: {
    id: string;
    sessionCode: string;
    state: string;
    conductedAt: string;
  };
  quiz: { id: string; name: string; description: string | null };
};

type ConductedRow = {
  id: string;
  sessionCode: string;
  state: string;
  conductedAt: string;
  participantCount: number;
  quiz: { id: string; name: string };
};

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

const MAX_PREVIEW = 3;

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [participated, setParticipated] = useState<ParticipatedRow[]>([]);
  const [conducted, setConducted] = useState<ConductedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load dashboard");
        return;
      }
      setQuizzes(data.quizzes ?? []);
      setParticipated(data.participated ?? []);
      setConducted(data.conducted ?? []);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    void loadDashboard();
    if (shouldShowOnboarding()) {
      setTourOpen(true);
    }
  }, [isPending, session, router, loadDashboard]);

  useEffect(() => {
    function openFromHashOrEvent() {
      if (window.location.hash === "#join") {
        setJoinOpen(true);
      }
    }
    openFromHashOrEvent();
    window.addEventListener("hashchange", openFromHashOrEvent);
    window.addEventListener("polloye:open-join", openFromHashOrEvent);
    return () => {
      window.removeEventListener("hashchange", openFromHashOrEvent);
      window.removeEventListener("polloye:open-join", openFromHashOrEvent);
    };
  }, []);

  function openJoin() {
    setJoinOpen(true);
    if (window.location.hash !== "#join") {
      window.history.replaceState(null, "", "#join");
    }
  }

  function closeJoin() {
    setJoinOpen(false);
    if (window.location.hash === "#join") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  async function startWaitingRoom(quizId: string) {
    setError("");
    setStatus("");
    setStartingId(quizId);
    try {
      const res = await fetch(`/api/quiz/${quizId}/session`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start waiting room");
        setStartingId(null);
        return;
      }
      router.push(`/join-quiz/${data.session.sessionCode}/host`);
    } catch {
      setError("Failed to start waiting room");
      setStartingId(null);
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (isPending || (loading && !session)) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body text-ink-muted m-0">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body text-ink-muted m-0">Redirecting to login…</p>
      </main>
    );
  }

  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div style={appShellVars} className="flex min-h-dvh flex-col">
      <OnboardingWalkthrough open={tourOpen} onClose={() => setTourOpen(false)} />
      <JoinQuizModal open={joinOpen} onClose={closeJoin} />

      <AppNav onSignOut={() => void signOut()} />

      <main className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-6 md:py-12">
        {(error || status) && (
          <div className="mb-4">
            {error && (
              <p className="text-body-sm m-0 text-semantic-error" role="alert">
                {error}
              </p>
            )}
            {status && (
              <p className="text-body-sm m-0 text-sage">{status}</p>
            )}
          </div>
        )}

        {/* ── Greeting ── */}
        <header className="dash-animate mb-8 flex flex-col gap-1">
          <Eyebrow tone="sage">Dashboard</Eyebrow>
          <h1 className="text-headline m-0 text-ink">
            Welcome back, {firstName}
          </h1>
          <p className="text-body-sm m-0 mt-1 text-ink-muted">
            Create, host, or join a live quiz session.
          </p>
        </header>

        {/* ── Action cards — 3-col grid, equal width, expanded ── */}
        <div
          id="join"
          className="mb-10 grid scroll-mt-20 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
        >
          {/* Create */}
          <Link
            href="/create-quiz"
            className="action-card dash-animate-scale dash-delay-1 flex flex-col items-start gap-4 rounded-lg border border-hairline bg-surface-1 p-5 no-underline sm:p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sage/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-medium text-ink">
                Create quiz
              </span>
              <span className="text-caption text-ink-muted">
                Build a new quiz from scratch with your own questions.
              </span>
            </div>
            <span
              className={`${linkBtn} mt-auto w-full justify-center bg-sage text-on-primary hover:opacity-90`}
            >
              Create
            </span>
          </Link>

          {/* Join */}
          <button
            type="button"
            onClick={openJoin}
            className="action-card dash-animate-scale dash-delay-2 flex cursor-pointer flex-col items-start gap-4 rounded-lg border border-hairline bg-surface-1 p-5 text-left sm:p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sage/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 10H9m0 0 2.5-2.5M9 10l2.5 2.5M5 5v10" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-medium text-ink">
                Join quiz
              </span>
              <span className="text-caption text-ink-muted">
                Enter a session code to join a live quiz as a participant.
              </span>
            </div>
            <span
              className={`${linkBtn} mt-auto w-full justify-center bg-sage text-on-primary`}
            >
              Join
            </span>
          </button>

          {/* Import */}
          <Link
            href="/import-quiz"
            className="action-card dash-animate-scale dash-delay-3 flex flex-col items-start gap-4 rounded-lg border border-hairline bg-surface-1 p-5 no-underline sm:p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sage/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6 13V7a2 2 0 0 1 2-2h5l3 3v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" stroke="var(--sage)" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M11 5v3h3" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 11h2m-1-1v2" stroke="var(--sage)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-medium text-ink">
                Import quiz
              </span>
              <span className="text-caption text-ink-muted">
                Bring in a quiz using a share code from another host.
              </span>
            </div>
            <span
              className={`${linkBtn} mt-auto w-full justify-center border border-hairline bg-surface-2 text-ink hover:bg-canvas`}
            >
              Import
            </span>
          </Link>
        </div>

        {/* ── Panels — Quizzes + Conducted side-by-side ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="dash-animate dash-delay-4">
            <Panel id="quizzes" title="Quizzes" href="/quizzes">
              {loading ? (
                <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
              ) : quizzes.length === 0 ? (
                <EmptyState
                  title="No quizzes yet"
                  description="Create or import a quiz to start."
                  className="border-0 bg-transparent p-1"
                />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {quizzes.slice(0, MAX_PREVIEW).map((quiz) => (
                    <li key={quiz.id}>
                      <div
                        className="panel-row flex cursor-pointer items-center justify-between gap-3 rounded-md border border-hairline bg-canvas px-3 py-2.5"
                        role="link"
                        tabIndex={0}
                        onClick={() =>
                          router.push(
                            `/quizzes?open=${encodeURIComponent(quiz.id)}`,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(
                              `/quizzes?open=${encodeURIComponent(quiz.id)}`,
                            );
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-body-sm font-medium text-ink">
                            {quiz.name}
                          </p>
                          <p className="text-caption m-0 text-ink-muted">
                            {quiz._count.questions} q · {quiz._count.sessions}{" "}
                            sessions
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="accent"
                          size="sm"
                          disabled={
                            startingId === quiz.id ||
                            quiz._count.questions === 0
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void startWaitingRoom(quiz.id);
                          }}
                          title={
                            quiz._count.questions === 0
                              ? "Add questions before starting"
                              : "Open host waiting room"
                          }
                        >
                          {startingId === quiz.id ? "…" : "Begin"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="dash-animate dash-delay-5">
            <Panel id="conducted" title="Conducted" href="/conducted-quizzes">
              {loading ? (
                <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
              ) : conducted.length === 0 ? (
                <EmptyState
                  title="Nothing hosted yet"
                  description="Start a waiting room from one of your quizzes."
                  className="border-0 bg-transparent p-1"
                />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {conducted.slice(0, MAX_PREVIEW).map((s) => (
                    <li key={s.id}>
                      <div
                        className="panel-row flex cursor-pointer items-center justify-between gap-3 rounded-md border border-hairline bg-canvas px-3 py-2.5"
                        role="link"
                        tabIndex={0}
                        onClick={() =>
                          router.push(
                            `/conducted-quizzes?open=${encodeURIComponent(s.id)}`,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(
                              `/conducted-quizzes?open=${encodeURIComponent(s.id)}`,
                            );
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="m-0 truncate text-body-sm font-medium text-ink">
                              {s.quiz.name}
                            </p>
                            <Badge tone="phase">{s.state.toLowerCase()}</Badge>
                          </div>
                          <p className="text-caption m-0 text-ink-muted">
                            <code className="text-mono">{s.sessionCode}</code> ·{" "}
                            {s.participantCount} players
                          </p>
                        </div>
                        {s.state === "FINISHED" ? (
                          <Link
                            href={`/result/${s.sessionCode}`}
                            className={`${linkBtn} min-h-9 px-3 py-1.5 text-caption border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                          >
                            Results
                          </Link>
                        ) : s.state === "INACTIVE" ? (
                          <Link
                            href={`/join-quiz/${s.sessionCode}/host`}
                            className={`${linkBtn} min-h-9 px-3 py-1.5 text-caption border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                          >
                            Lobby
                          </Link>
                        ) : (
                          <Link
                            href={`/quiz/${s.sessionCode}/host`}
                            className={`${linkBtn} min-h-9 px-3 py-1.5 text-caption border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                          >
                            Resume
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {/* ── Participated — full width below ── */}
        <div className="dash-animate dash-delay-6 mt-6">
          <Panel id="participated" title="Participated" href="/participated-quizzes">
            {loading ? (
              <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
            ) : participated.length === 0 ? (
              <EmptyState
                title="No participations yet"
                description="Join a live session with a code from your host."
                className="border-0 bg-transparent p-1"
                action={
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={openJoin}
                  >
                    Join quiz
                  </Button>
                }
              />
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
                {participated.slice(0, MAX_PREVIEW).map((p) => (
                  <li key={p.id}>
                    <div
                      className="panel-row flex h-full cursor-pointer items-center justify-between gap-3 rounded-md border border-hairline bg-canvas px-3 py-2.5"
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(
                          `/participated-quizzes?highlight=${encodeURIComponent(p.id)}`,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(
                            `/participated-quizzes?highlight=${encodeURIComponent(p.id)}`,
                          );
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-body-sm font-medium text-ink">
                          {p.quiz.name}
                        </p>
                        <p className="text-caption m-0 text-ink-muted">
                          {p.participantName} ·{" "}
                          <span className="text-mono">{p.totalScore}</span> ·{" "}
                          <code className="text-mono">
                            {p.session.sessionCode}
                          </code>
                        </p>
                      </div>
                      {p.session.state === "FINISHED" ? (
                        <Link
                          href={`/result/${p.session.sessionCode}`}
                          className={`${linkBtn} min-h-9 shrink-0 px-3 py-1.5 text-caption border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                        >
                          Results
                        </Link>
                      ) : (
                        <Link
                          href={`/join-quiz/${p.session.sessionCode}`}
                          className={`${linkBtn} min-h-9 shrink-0 px-3 py-1.5 text-caption border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                        >
                          Open
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Panel({
  id,
  title,
  href,
  children,
  className,
}: {
  id: string;
  title: string;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cx(
        "flex flex-col rounded-lg border border-hairline bg-surface-1 scroll-mt-20",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <h2 className="text-body-sm m-0 font-medium text-ink">{title}</h2>
        <Link
          href={href}
          className="shrink-0 text-caption font-medium text-ink-muted no-underline hover:text-ink"
        >
          View all
        </Link>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
