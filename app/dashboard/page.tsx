"use client";

import {
  type CSSProperties,
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
  const [importing, setImporting] = useState(false);

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

  async function onImport(e: FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");
    setImporting(true);
    try {
      const code = importCode.trim().toUpperCase();
      const res = await fetch(`/api/share-quiz/${encodeURIComponent(code)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setImporting(false);
        return;
      }
      setStatus(`Imported “${data.quiz.name}”`);
      setImportCode("");
      await loadDashboard();
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (isPending || (loading && !session)) {
    return <main style={appShellVars}>Loading…</main>;
  }

  if (!session) {
    return <main style={appShellVars}>Redirecting to login…</main>;
  }

  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div style={appShellVars}>
      <OnboardingWalkthrough open={tourOpen} onClose={() => setTourOpen(false)} />

      <AppNav onTour={() => setTourOpen(true)} onSignOut={() => void signOut()} />

      <main style={main}>
        <section style={hero}>
          <h1 style={display}>Welcome, {firstName}</h1>
          <p style={lead}>
            Create live quizzes, host sessions, or jump into someone else’s game.
          </p>
        </section>

        <section style={ctaGrid} aria-label="Quick actions">
          <article style={ctaCard}>
            <h2 style={cardTitle}>Create a quiz</h2>
            <p style={cardBody}>
              Build a template with questions, timers, and scoring — then host it live.
            </p>
            <Link href="/create-quiz" style={btnAccent}>
              Create quiz
            </Link>
          </article>

          <article id="join" style={ctaCard}>
            <h2 style={cardTitle}>Join a quiz</h2>
            <p style={cardBody}>
              Enter the 6-character session code from your host.
            </p>
            <form onSubmit={onJoin} style={inlineForm}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Session code"
                maxLength={6}
                required
                style={input}
                aria-label="Session code"
              />
              <button
                type="submit"
                style={btnPrimary}
                disabled={joinCode.trim().length < 4}
              >
                Join
              </button>
            </form>
          </article>

          <article style={ctaCard}>
            <h2 style={cardTitle}>Import a template</h2>
            <p style={cardBody}>
              Paste a quiz sharing code to clone it into your account.
            </p>
            <form onSubmit={onImport} style={inlineForm}>
              <input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                placeholder="Share code"
                maxLength={6}
                required
                style={input}
                aria-label="Quiz sharing code"
              />
              <button
                type="submit"
                style={btnSecondary}
                disabled={importing || importCode.trim().length < 6}
              >
                {importing ? "…" : "Import"}
              </button>
            </form>
          </article>
        </section>

        {error && <p style={errorText}>{error}</p>}
        {status && <p style={statusText}>{status}</p>}

        <section id="quizzes" style={section}>
          <div style={sectionHead}>
            <div>
              <h2 style={sectionTitle}>Your quiz templates</h2>
              <p style={sectionSub}>Quizzes you’ve created — start a waiting room anytime.</p>
            </div>
            <Link href="/quizzes" style={textLink}>
              View all
            </Link>
          </div>

          {loading ? (
            <p style={muted}>Loading…</p>
          ) : quizzes.length === 0 ? (
            <div style={emptyCard}>
              <p style={{ margin: 0 }}>
                No templates yet.{" "}
                <Link href="/create-quiz" style={inlineLink}>
                  Create your first quiz
                </Link>{" "}
                or import a sharing code above.
              </p>
            </div>
          ) : (
            <ul style={list}>
              {quizzes.slice(0, 6).map((quiz) => (
                <li key={quiz.id} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={rowTitle}>{quiz.name}</strong>
                    {quiz.description && (
                      <p style={rowMeta}>{quiz.description}</p>
                    )}
                    <p style={rowMeta}>
                      {quiz._count.questions} questions · {quiz._count.sessions}{" "}
                      sessions · share <code>{quiz.quizSharingCode}</code>
                      {" · "}
                      <Link href={`/share-quiz/${quiz.quizSharingCode}`} style={inlineLink}>
                        share
                      </Link>
                    </p>
                  </div>
                  <button
                    type="button"
                    style={btnPrimary}
                    disabled={
                      startingId === quiz.id || quiz._count.questions === 0
                    }
                    onClick={() => void startWaitingRoom(quiz.id)}
                    title={
                      quiz._count.questions === 0
                        ? "Add questions before starting"
                        : "Open host waiting room"
                    }
                  >
                    {startingId === quiz.id ? "Starting…" : "Host"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="conducted" style={section}>
          <div style={sectionHead}>
            <div>
              <h2 style={sectionTitle}>Conducted quizzes</h2>
              <p style={sectionSub}>Live sessions you’ve hosted.</p>
            </div>
            <Link href="/conducted-quizzes" style={textLink}>
              View all
            </Link>
          </div>

          {loading ? (
            <p style={muted}>Loading…</p>
          ) : conducted.length === 0 ? (
            <div style={emptyCard}>
              <p style={{ margin: 0 }}>
                You haven’t hosted a session yet. Start one from a template above.
              </p>
            </div>
          ) : (
            <ul style={list}>
              {conducted.slice(0, 8).map((s) => (
                <li key={s.id} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={rowTitle}>{s.quiz.name}</strong>
                    <p style={rowMeta}>
                      Code <code>{s.sessionCode}</code> · {s.state.toLowerCase()} ·{" "}
                      {s.participantCount} players ·{" "}
                      {new Date(s.conductedAt).toLocaleString()}
                    </p>
                  </div>
                  {s.state === "FINISHED" ? (
                    <Link href={`/result/${s.sessionCode}`} style={btnSecondary}>
                      Results
                    </Link>
                  ) : s.state === "INACTIVE" ? (
                    <Link
                      href={`/join-quiz/${s.sessionCode}/host`}
                      style={btnSecondary}
                    >
                      Waiting room
                    </Link>
                  ) : (
                    <Link href={`/quiz/${s.sessionCode}/host`} style={btnSecondary}>
                      Resume host
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="participated" style={section}>
          <div style={sectionHead}>
            <div>
              <h2 style={sectionTitle}>Participated quizzes</h2>
              <p style={sectionSub}>
                Sessions you joined while signed in.
              </p>
            </div>
            <Link href="/participated-quizzes" style={textLink}>
              View all
            </Link>
          </div>

          {loading ? (
            <p style={muted}>Loading…</p>
          ) : participated.length === 0 ? (
            <div style={emptyCard}>
              <p style={{ margin: 0 }}>
                No participations yet. Use Join quiz when someone shares a session
                code.
              </p>
            </div>
          ) : (
            <ul style={list}>
              {participated.slice(0, 8).map((p) => (
                <li key={p.id} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={rowTitle}>{p.quiz.name}</strong>
                    <p style={rowMeta}>
                      As {p.participantName} · score {p.totalScore} ·{" "}
                      <code>{p.session.sessionCode}</code> ·{" "}
                      {p.session.state.toLowerCase()}
                    </p>
                  </div>
                  {p.session.state === "FINISHED" ? (
                    <Link
                      href={`/result/${p.session.sessionCode}`}
                      style={btnSecondary}
                    >
                      Results
                    </Link>
                  ) : (
                    <Link
                      href={`/join-quiz/${p.session.sessionCode}`}
                      style={btnSecondary}
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

const textLink: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--ink)",
  textDecoration: "none",
};

const main: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "48px 24px 96px",
  display: "grid",
  gap: 48,
};

const hero: CSSProperties = {
  display: "grid",
  gap: 12,
  maxWidth: 640,
};

const display: CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: 500,
  letterSpacing: "-0.8px",
  lineHeight: 1.15,
};

const lead: CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.5,
  color: "var(--ink-muted)",
};

const ctaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const ctaCard: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: 24,
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.3px",
};

const cardBody: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--ink-muted)",
};

const inlineForm: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 4,
};

const input: CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--hairline)",
  fontSize: 16,
  fontFamily: "inherit",
  letterSpacing: 1,
  background: "var(--surface)",
  color: "var(--ink)",
};

const btnBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.2,
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid transparent",
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: "var(--ink)",
  color: "#fff",
};

const btnAccent: CSSProperties = {
  ...btnBase,
  background: "var(--sage)",
  color: "#fff",
  width: "fit-content",
};

const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "var(--surface)",
  color: "var(--ink)",
  borderColor: "var(--hairline)",
};

const section: CSSProperties = {
  display: "grid",
  gap: 16,
  scrollMarginTop: 72,
};

const sectionHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.5px",
};

const sectionSub: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 14,
  color: "var(--ink-muted)",
};

const list: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 12,
};

const row: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  gap: 16,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const rowTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
};

const rowMeta: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--ink-muted)",
};

const emptyCard: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: 24,
  color: "var(--ink-muted)",
  fontSize: 15,
};

const muted: CSSProperties = {
  margin: 0,
  color: "var(--ink-muted)",
};

const inlineLink: CSSProperties = {
  color: "var(--ink)",
  fontWeight: 500,
};

const errorText: CSSProperties = { margin: 0, color: "#c41c1c" };
const statusText: CSSProperties = { margin: 0, color: "var(--sage)" };
