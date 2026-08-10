"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import {
  Button,
  Card,
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

type SessionRow = {
  id: string;
  sessionCode: string;
  state: string;
  conductedAt: string;
  startedAt: string;
  endedAt: string | null;
  participantCount: number;
};

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

function IconShare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatLongDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `${ordinal(d.getDate())} ${month} ${d.getFullYear()}`;
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const { data: session, isPending } = authClient.useSession();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(openId);
  const [sessionsOpenId, setSessionsOpenId] = useState<string | null>(null);
  const [sessionsByQuiz, setSessionsByQuiz] = useState<
    Record<string, SessionRow[]>
  >({});
  const [sessionsLoadingId, setSessionsLoadingId] = useState<string | null>(
    null,
  );
  const [sessionsErrorByQuiz, setSessionsErrorByQuiz] = useState<
    Record<string, string>
  >({});

  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [shareRevealedId, setShareRevealedId] = useState<string | null>(null);
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quiz");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load quizzes");
        return;
      }
      setQuizzes(data.quizzes ?? []);
    } catch {
      setError("Failed to load quizzes");
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
    void loadQuizzes();
  }, [isPending, session, router, loadQuizzes]);

  useEffect(() => {
    if (openId) setExpandedId(openId);
  }, [openId]);

  useEffect(() => {
    setShareRevealedId(null);
    setShareCopiedId(null);
  }, [expandedId]);

  async function shareQuiz(quiz: QuizRow) {
    const url = `${window.location.origin}/share-quiz/${quiz.quizSharingCode}`;
    setShareRevealedId(quiz.id);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopiedId(quiz.id);
      window.setTimeout(() => {
        setShareCopiedId((id) => (id === quiz.id ? null : id));
      }, 2000);
    } catch {
      setError("Could not copy share link");
    }
  }

  async function deleteQuiz(quiz: QuizRow) {
    const ok = window.confirm(
      `Delete “${quiz.name}”? This cannot be undone.`,
    );
    if (!ok) return;

    setError("");
    setDeletingId(quiz.id);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to delete quiz");
        setDeletingId(null);
        return;
      }
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      if (expandedId === quiz.id) setExpandedId(null);
      setSessionsByQuiz((prev) => {
        const next = { ...prev };
        delete next[quiz.id];
        return next;
      });
    } catch {
      setError("Failed to delete quiz");
    } finally {
      setDeletingId(null);
    }
  }

  async function loadSessions(quizId: string, opts?: { force?: boolean }) {
    if (!opts?.force && sessionsByQuiz[quizId] !== undefined) return;

    setSessionsLoadingId(quizId);
    setSessionsErrorByQuiz((prev) => {
      const next = { ...prev };
      delete next[quizId];
      return next;
    });

    try {
      const res = await fetch(`/api/quiz/${quizId}/sessions`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : "Failed to load sessions";
        setSessionsErrorByQuiz((prev) => ({ ...prev, [quizId]: message }));
        return;
      }
      setSessionsByQuiz((prev) => ({
        ...prev,
        [quizId]: Array.isArray(data.sessions) ? data.sessions : [],
      }));
    } catch {
      setSessionsErrorByQuiz((prev) => ({
        ...prev,
        [quizId]: "Failed to load sessions",
      }));
    } finally {
      setSessionsLoadingId(null);
    }
  }

  async function toggleSessions(quizId: string) {
    if (sessionsOpenId === quizId) {
      setSessionsOpenId(null);
      return;
    }
    setSessionsOpenId(quizId);
    const needsFetch =
      sessionsByQuiz[quizId] === undefined ||
      sessionsErrorByQuiz[quizId] != null;
    await loadSessions(quizId, { force: needsFetch });
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

  if (isPending || (loading && !session)) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body m-0 text-ink-muted">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body m-0 text-ink-muted">Redirecting to login…</p>
      </main>
    );
  }

  return (
    <div style={appShellVars}>
      <AppNav />
      <main className="mx-auto grid max-w-[900px] gap-6 px-6 pb-24 pt-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <Eyebrow>Library</Eyebrow>
            <h1 className="text-display-md m-0 text-ink">My quizzes</h1>
            <p className="text-body m-0 text-ink-muted">
              Templates you’ve created — host a live session anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/import-quiz"
              className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
            >
              Import quiz
            </Link>
            <Link
              href="/create-quiz"
              className={`${linkBtn} bg-sage text-on-primary hover:opacity-90`}
            >
              Create quiz
            </Link>
          </div>
        </header>

        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}
        {status && <p className="text-body-sm m-0 text-sage">{status}</p>}

        {loading ? (
          <p className="text-body-sm m-0 text-ink-muted">Loading quizzes…</p>
        ) : quizzes.length === 0 ? (
          <EmptyState
            title="No quizzes yet"
            description="Create a template or import a sharing code to get started."
            action={
              <Link
                href="/create-quiz"
                className={`${linkBtn} bg-sage text-on-primary hover:opacity-90`}
              >
                Create quiz
              </Link>
            }
          />
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {quizzes.map((quiz) => {
              const isExpanded = expandedId === quiz.id;
              const sessionsOpen = sessionsOpenId === quiz.id;
              const sessions = sessionsByQuiz[quiz.id] ?? [];

              return (
                <li key={quiz.id}>
                  <Card
                    padding={isExpanded ? "lg" : "md"}
                    className={cx(
                      "relative cursor-pointer transition-colors hover:border-ink",
                      isExpanded && "border-ink",
                    )}
                    onClick={() =>
                      setExpandedId((id) => (id === quiz.id ? null : quiz.id))
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId((id) =>
                          id === quiz.id ? null : quiz.id,
                        );
                      }
                    }}
                  >
                    {isExpanded && (
                      <div
                        className="absolute top-4 right-4 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          aria-label={
                            shareCopiedId === quiz.id
                              ? "Share link copied"
                              : "Share quiz"
                          }
                          title={
                            shareCopiedId === quiz.id
                              ? "Share link copied"
                              : "Share quiz"
                          }
                          onClick={() => void shareQuiz(quiz)}
                        >
                          {shareCopiedId === quiz.id ? (
                            <IconCheck />
                          ) : (
                            <IconShare />
                          )}
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-semantic-error disabled:opacity-40"
                          aria-label="Delete quiz"
                          title="Delete quiz"
                          disabled={deletingId === quiz.id}
                          onClick={() => void deleteQuiz(quiz)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}

                    {isExpanded && openId === quiz.id && (
                      <Eyebrow tone="sage" className="mb-2">
                        Just saved
                      </Eyebrow>
                    )}

                    <strong
                      className={cx(
                        "font-medium",
                        isExpanded ? "text-card-title pr-12" : "text-subhead",
                      )}
                    >
                      {quiz.name}
                    </strong>

                    {quiz.description ? (
                      <p
                        className={cx(
                          "mt-1 mb-0 text-ink-muted",
                          isExpanded ? "text-body" : "text-body-sm",
                        )}
                      >
                        {quiz.description}
                      </p>
                    ) : isExpanded ? (
                      <p className="text-body-sm mt-1 mb-0 text-ink-tertiary">
                        No description
                      </p>
                    ) : null}

                    <p className="text-caption mt-1 mb-0 text-ink-muted">
                      {quiz._count.questions}{" "}
                      {quiz._count.questions === 1 ? "question" : "questions"}
                      {" · "}
                      {quiz._count.sessions}{" "}
                      {quiz._count.sessions === 1 ? "session" : "sessions"}
                    </p>

                    {isExpanded && shareRevealedId === quiz.id && (
                      <p className="text-body-sm mt-3 mb-0 text-ink">
                        Share code{" "}
                        <code className="text-mono tracking-wide">
                          {quiz.quizSharingCode}
                        </code>
                        {shareCopiedId === quiz.id && (
                          <span className="text-caption text-sage">
                            {" "}
                            · link copied
                          </span>
                        )}
                      </p>
                    )}

                    {isExpanded && (
                      <div
                        className="mt-4 grid gap-3"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/create-quiz?quizId=${quiz.id}`}
                            className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                          >
                            Edit
                          </Link>
                          <Button
                            type="button"
                            variant="accent"
                            disabled={
                              startingId === quiz.id ||
                              quiz._count.questions === 0
                            }
                            onClick={() => void startWaitingRoom(quiz.id)}
                            title={
                              quiz._count.questions === 0
                                ? "Add questions before starting"
                                : "Open host waiting room"
                            }
                          >
                            {startingId === quiz.id ? "Starting…" : "Begin"}
                          </Button>
                        </div>

                        {quiz._count.sessions > 0 && (
                          <div className="border-t border-hairline-soft pt-3">
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent p-0 text-left"
                              aria-expanded={sessionsOpen}
                              onClick={() => void toggleSessions(quiz.id)}
                            >
                              <span className="text-body-sm font-medium text-ink">
                                Sessions ({quiz._count.sessions})
                              </span>
                              <span
                                className={cx(
                                  "text-ink-muted transition-transform",
                                  sessionsOpen ? "rotate-0" : "-rotate-90",
                                )}
                                aria-hidden
                              >
                                ▾
                              </span>
                            </button>

                            {sessionsOpen && (
                              <div className="mt-3 grid gap-2">
                                {sessionsLoadingId === quiz.id ? (
                                  <p className="text-caption m-0 text-ink-muted">
                                    Loading sessions…
                                  </p>
                                ) : sessionsErrorByQuiz[quiz.id] ? (
                                  <div className="grid gap-2">
                                    <p
                                      className="text-caption m-0 text-semantic-error"
                                      role="alert"
                                    >
                                      {sessionsErrorByQuiz[quiz.id]}
                                    </p>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="w-fit"
                                      onClick={() =>
                                        void loadSessions(quiz.id, {
                                          force: true,
                                        })
                                      }
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : sessions.length === 0 ? (
                                  <p className="text-caption m-0 text-ink-muted">
                                    No sessions yet.
                                  </p>
                                ) : (
                                  <ul className="m-0 grid list-none gap-2 p-0">
                                    {sessions.map((s) => (
                                      <li
                                        key={s.id}
                                        className="rounded-md border border-hairline bg-canvas px-3 py-2"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-body-sm m-0 font-medium text-ink">
                                              {formatLongDate(s.startedAt)} ·{" "}
                                              {formatClock(s.startedAt)}
                                            </p>
                                            <p className="text-caption mt-0.5 mb-0 text-ink-muted">
                                              <code className="text-mono">
                                                {s.sessionCode}
                                              </code>
                                              {" · "}
                                              {s.participantCount}{" "}
                                              {s.participantCount === 1
                                                ? "player"
                                                : "players"}
                                              {" · "}
                                              {s.state.toLowerCase()}
                                            </p>
                                          </div>
                                          {s.state === "FINISHED" && (
                                            <Link
                                              href={`/result/${s.sessionCode}`}
                                              className="text-body-sm font-medium text-ink underline-offset-2 hover:underline"
                                            >
                                              Results
                                            </Link>
                                          )}
                                          {s.state === "INACTIVE" && (
                                            <Link
                                              href={`/join-quiz/${s.sessionCode}/host`}
                                              className="text-body-sm font-medium text-ink underline-offset-2 hover:underline"
                                            >
                                              Lobby
                                            </Link>
                                          )}
                                          {s.state === "ACTIVE" && (
                                            <Link
                                              href={`/quiz/${s.sessionCode}/host`}
                                              className="text-body-sm font-medium text-ink underline-offset-2 hover:underline"
                                            >
                                              Resume
                                            </Link>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense
      fallback={
        <main
          style={appShellVars}
          className="flex items-center justify-center p-8"
        >
          <p className="text-body m-0 text-ink-muted">Loading…</p>
        </main>
      }
    >
      <QuizzesContent />
    </Suspense>
  );
}
