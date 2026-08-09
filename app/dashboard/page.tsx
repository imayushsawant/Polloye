"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import {
  OnboardingWalkthrough,
  shouldShowOnboarding,
} from "@/components/onboarding-walkthrough";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Input,
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

  const [joinCode, setJoinCode] = useState("");
  const [importCode, setImportCode] = useState("");

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

  function onJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    router.push(`/join-quiz/${code}`);
  }

  function onImport(e: FormEvent) {
    e.preventDefault();
    const code = importCode.trim().toUpperCase();
    if (code.length < 6) return;
    router.push(`/share-quiz/${encodeURIComponent(code)}`);
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
    <div style={appShellVars}>
      <OnboardingWalkthrough open={tourOpen} onClose={() => setTourOpen(false)} />

      <AppNav onSignOut={() => void signOut()} />

      <main className="mx-auto grid max-w-[1100px] gap-12 px-6 pb-24 pt-12">
        <section className="grid max-w-xl gap-3">
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="text-display-md m-0 text-ink">Welcome, {firstName}</h1>
          <p className="text-body-lg m-0 text-ink-muted">
            Create live quizzes, host sessions, or jump into someone else’s game.
          </p>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Quick actions"
        >
          <Card className="flex flex-col gap-3">
            <h2 className="text-card-title m-0">Create a quiz</h2>
            <p className="text-body-sm m-0 flex-1 text-ink-muted">
              Build a template with questions, timers, and scoring — then host it live.
            </p>
            <Link
              href="/create-quiz"
              className={`${linkBtn} w-fit bg-sage text-on-primary hover:opacity-90`}
            >
              Create quiz
            </Link>
          </Card>

          <Card id="join" className="flex flex-col gap-3 scroll-mt-20">
            <h2 className="text-card-title m-0">Join a quiz</h2>
            <p className="text-body-sm m-0 text-ink-muted">
              Enter the 6-character session code from your host.
            </p>
            <form onSubmit={onJoin} className="mt-1 flex flex-wrap gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Session code"
                maxLength={6}
                required
                aria-label="Session code"
                className="min-w-[140px] flex-1"
              />
              <Button
                type="submit"
                variant="accent"
                disabled={joinCode.trim().length < 4}
              >
                Join
              </Button>
            </form>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-card-title m-0">Import a quiz</h2>
            <p className="text-body-sm m-0 text-ink-muted">
              Paste a quiz sharing code to preview and clone it into your account.
            </p>
            <form onSubmit={onImport} className="mt-1 flex flex-wrap gap-2">
              <Input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                placeholder="Share code"
                maxLength={6}
                required
                aria-label="Quiz sharing code"
                className="min-w-[140px] flex-1"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={importCode.trim().length < 6}
              >
                Import
              </Button>
            </form>
          </Card>
        </section>

        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="text-body-sm m-0 text-sage">{status}</p>
        )}

        <section id="quizzes" className="grid scroll-mt-20 gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-headline m-0">Your quizzes</h2>
              <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                Quizzes you’ve created — start a waiting room anytime.
              </p>
            </div>
            <Link
              href="/quizzes"
              className="text-body-sm font-medium text-ink no-underline hover:text-ink-muted"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
          ) : quizzes.length === 0 ? (
            <EmptyState
              title="No quizzes yet"
              description="Create your first quiz or import a sharing code above."
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
              {quizzes.slice(0, 6).map((quiz) => (
                <li key={quiz.id}>
                  <Card
                    padding="md"
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-4 transition-colors hover:border-ink"
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
                      <strong className="text-subhead font-medium">{quiz.name}</strong>
                      {quiz.description && (
                        <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                          {quiz.description}
                        </p>
                      )}
                      <p className="text-caption mt-1 mb-0 text-ink-muted">
                        {quiz._count.questions} questions · {quiz._count.sessions}{" "}
                        sessions
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="accent"
                      disabled={
                        startingId === quiz.id || quiz._count.questions === 0
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
                      {startingId === quiz.id ? "Starting…" : "Begin"}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="conducted" className="grid scroll-mt-20 gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-headline m-0">Conducted quizzes</h2>
              <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                Live sessions you’ve hosted.
              </p>
            </div>
            <Link
              href="/conducted-quizzes"
              className="text-body-sm font-medium text-ink no-underline hover:text-ink-muted"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
          ) : conducted.length === 0 ? (
            <EmptyState
              title="No sessions hosted yet"
              description="Start one from a quiz above when you’re ready to go live."
            />
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {conducted.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-subhead font-medium">{s.quiz.name}</strong>
                        <Badge tone="phase">{s.state.toLowerCase()}</Badge>
                      </div>
                      <p className="text-caption mt-1 mb-0 text-ink-muted">
                        Code <code className="text-mono">{s.sessionCode}</code> ·{" "}
                        {s.participantCount} players ·{" "}
                        {new Date(s.conductedAt).toLocaleString()}
                      </p>
                    </div>
                    {s.state === "FINISHED" ? (
                      <Link
                        href={`/result/${s.sessionCode}`}
                        className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                      >
                        Results
                      </Link>
                    ) : s.state === "INACTIVE" ? (
                      <Link
                        href={`/join-quiz/${s.sessionCode}/host`}
                        className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                      >
                        Waiting room
                      </Link>
                    ) : (
                      <Link
                        href={`/quiz/${s.sessionCode}/host`}
                        className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                      >
                        Resume host
                      </Link>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="participated" className="grid scroll-mt-20 gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-headline m-0">Participated quizzes</h2>
              <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                Sessions you joined while signed in.
              </p>
            </div>
            <Link
              href="/participated-quizzes"
              className="text-body-sm font-medium text-ink no-underline hover:text-ink-muted"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
          ) : participated.length === 0 ? (
            <EmptyState
              title="No participations yet"
              description="Use Join quiz when someone shares a session code."
              action={
                <Link
                  href="/dashboard#join"
                  className={`${linkBtn} bg-sage text-on-primary hover:opacity-90`}
                >
                  Join
                </Link>
              }
            />
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {participated.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <strong className="text-subhead font-medium">{p.quiz.name}</strong>
                      <p className="text-caption mt-1 mb-0 text-ink-muted">
                        As {p.participantName} · score{" "}
                        <span className="text-mono">{p.totalScore}</span> ·{" "}
                        <code className="text-mono">{p.session.sessionCode}</code> ·{" "}
                        {p.session.state.toLowerCase()}
                      </p>
                    </div>
                    {p.session.state === "FINISHED" ? (
                      <Link
                        href={`/result/${p.session.sessionCode}`}
                        className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                      >
                        Results
                      </Link>
                    ) : (
                      <Link
                        href={`/join-quiz/${p.session.sessionCode}`}
                        className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                      >
                        Open
                      </Link>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
