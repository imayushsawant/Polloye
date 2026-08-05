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

type QuizRow = {
  id: string;
  name: string;
  description: string | null;
  quizSharingCode: string;
  createdAt: string;
  _count: { questions: number; sessions: number };
};

export default function QuizzesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importing, setImporting] = useState(false);

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

  async function importQuiz(e: FormEvent) {
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
      setImportOpen(false);
      await loadQuizzes();
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  }

  if (isPending || (loading && !session)) {
    return <main style={appShellVars}>Loading…</main>;
  }

  if (!session) {
    return <main style={appShellVars}>Redirecting to login…</main>;
  }

  return (
    <div style={appShellVars}>
      <AppNav />
      <main style={main}>
        <header style={pageHead}>
          <div>
            <h1 style={title}>My quizzes</h1>
            <p style={sub}>Templates you’ve created — host a live session anytime.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btnSecondary} onClick={() => setImportOpen((o) => !o)}>
              Import quiz
            </button>
            <Link href="/create-quiz" style={btnAccent}>
              Create quiz
            </Link>
          </div>
        </header>

        {importOpen && (
          <section style={card}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
              Import from sharing code
            </h2>
            <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: 14 }}>
              Paste another user’s 6-character quiz sharing code to clone it into
              your account.
            </p>
            <form onSubmit={importQuiz} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={6}
                required
                style={input}
              />
              <button
                type="submit"
                style={btnPrimary}
                disabled={importing || importCode.trim().length < 6}
              >
                {importing ? "Importing…" : "Import"}
              </button>
              <button type="button" style={btnSecondary} onClick={() => setImportOpen(false)}>
                Cancel
              </button>
            </form>
          </section>
        )}

        {error && <p style={errorText}>{error}</p>}
        {status && <p style={statusText}>{status}</p>}

        {loading ? (
          <p style={muted}>Loading quizzes…</p>
        ) : quizzes.length === 0 ? (
          <section style={card}>
            <p style={{ margin: 0 }}>
              You haven’t created any quizzes yet.{" "}
              <Link href="/create-quiz" style={inlineLink}>
                Create one
              </Link>{" "}
              or import a sharing code.
            </p>
          </section>
        ) : (
          <ul style={list}>
            {quizzes.map((quiz) => (
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
                      share link
                    </Link>
                    {" · "}
                    <Link href="/create-quiz" style={inlineLink}>
                      edit in builder
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
                  {startingId === quiz.id ? "Starting…" : "Start waiting room"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const main: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "48px 24px 96px",
  display: "grid",
  gap: 24,
};

const pageHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: 500,
  letterSpacing: "-0.8px",
  lineHeight: 1.15,
};

const sub: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 16,
  lineHeight: 1.5,
  color: "var(--ink-muted)",
};

const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 12,
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

const rowTitle: CSSProperties = { fontSize: 18, fontWeight: 500 };
const rowMeta: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--ink-muted)",
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
};

const btnBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 500,
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
};

const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "var(--surface)",
  color: "var(--ink)",
  borderColor: "var(--hairline)",
};

const muted: CSSProperties = { margin: 0, color: "var(--ink-muted)" };
const errorText: CSSProperties = { margin: 0, color: "#c41c1c" };
const statusText: CSSProperties = { margin: 0, color: "var(--sage)" };
const inlineLink: CSSProperties = { color: "var(--ink)", fontWeight: 500 };
