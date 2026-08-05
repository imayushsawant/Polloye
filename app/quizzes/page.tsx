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
    return <main style={page}>Loading…</main>;
  }

  if (!session) {
    return <main style={page}>Redirecting to login…</main>;
  }

  return (
    <main style={page}>
      <header style={header}>
        <div>
          <h1 style={{ margin: 0 }}>My quizzes</h1>
          <p style={{ margin: "4px 0 0", color: "#555" }}>
            Signed in as {session.user.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <button type="button" onClick={() => setImportOpen((o) => !o)}>
            Import quiz
          </button>
          <Link href="/create-quiz" style={linkBtn}>
            Create quiz
          </Link>
          <button type="button" onClick={() => authClient.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {importOpen && (
        <section style={card}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Import from sharing code</h2>
          <p style={{ margin: 0, color: "#555", fontSize: 14 }}>
            Paste another user’s 6-character quiz sharing code to clone it into
            your account.
          </p>
          <form onSubmit={importQuiz} style={{ display: "flex", gap: 8 }}>
            <input
              value={importCode}
              onChange={(e) => setImportCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD"
              maxLength={6}
              required
              style={{ flex: 1, padding: 8, letterSpacing: 2 }}
            />
            <button type="submit" disabled={importing || importCode.trim().length < 6}>
              {importing ? "Importing…" : "Import"}
            </button>
            <button type="button" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
          </form>
        </section>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {status && <p style={{ color: "green" }}>{status}</p>}

      {loading ? (
        <p>Loading quizzes…</p>
      ) : quizzes.length === 0 ? (
        <section style={card}>
          <p style={{ margin: 0 }}>
            You haven’t created any quizzes yet.{" "}
            <Link href="/create-quiz">Create one</Link> or import a sharing
            code.
          </p>
        </section>
      ) : (
        <ul style={list}>
          {quizzes.map((quiz) => (
            <li key={quiz.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 18 }}>{quiz.name}</strong>
                {quiz.description && (
                  <p style={{ margin: "4px 0 0", color: "#555" }}>
                    {quiz.description}
                  </p>
                )}
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>
                  {quiz._count.questions} questions · {quiz._count.sessions}{" "}
                  sessions · share{" "}
                  <code>{quiz.quizSharingCode}</code>
                  {" · "}
                  <Link href={`/share-quiz/${quiz.quizSharingCode}`}>
                    share link
                  </Link>
                  {" · "}
                  <Link href={`/create-quiz`}>edit in builder</Link>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={
                    startingId === quiz.id || quiz._count.questions === 0
                  }
                  onClick={() => startWaitingRoom(quiz.id)}
                  title={
                    quiz._count.questions === 0
                      ? "Add questions before starting"
                      : "Open host waiting room"
                  }
                >
                  {startingId === quiz.id
                    ? "Starting…"
                    : "Start waiting room"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 24,
  display: "grid",
  gap: 20,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
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
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  display: "flex",
  gap: 16,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const linkBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  textDecoration: "none",
  color: "inherit",
  background: "#f7f7f7",
};
