"use client";

import {
  type FormEvent,
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

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

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

  useEffect(() => {
    if (openId) setExpandedId(openId);
  }, [openId]);

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
      setExpandedId(data.quiz.id);
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
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

  const opened = expandedId
    ? quizzes.find((q) => q.id === expandedId)
    : undefined;
  const rest = expandedId
    ? quizzes.filter((q) => q.id !== expandedId)
    : quizzes;

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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportOpen((o) => !o)}
            >
              Import quiz
            </Button>
            <Link
              href="/create-quiz"
              className={`${linkBtn} bg-sage text-on-primary hover:opacity-90`}
            >
              Create quiz
            </Link>
          </div>
        </header>

        {importOpen && (
          <Card className="grid gap-3">
            <h2 className="text-subhead m-0 font-medium">
              Import from sharing code
            </h2>
            <p className="text-body-sm m-0 text-ink-muted">
              Paste another user’s 6-character quiz sharing code to clone it
              into your account.
            </p>
            <form onSubmit={importQuiz} className="flex flex-wrap gap-2">
              <Input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={6}
                required
                aria-label="Quiz sharing code"
                className="min-w-[140px] flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={importing || importCode.trim().length < 6}
              >
                {importing ? "Importing…" : "Import"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
            </form>
          </Card>
        )}

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
            {opened && (
              <li>
                <Card className="grid gap-4 border-ink">
                  <div className="grid gap-1">
                    {openId === opened.id && (
                      <Eyebrow tone="sage">Just saved</Eyebrow>
                    )}
                    <h2 className="text-card-title m-0">{opened.name}</h2>
                    {opened.description ? (
                      <p className="text-body m-0 text-ink-muted">
                        {opened.description}
                      </p>
                    ) : (
                      <p className="text-body-sm m-0 text-ink-tertiary">
                        No description
                      </p>
                    )}
                    <p className="text-caption m-0 text-ink-muted">
                      {opened._count.questions}{" "}
                      {opened._count.questions === 1
                        ? "question"
                        : "questions"}
                      {" · "}
                      {opened._count.sessions}{" "}
                      {opened._count.sessions === 1 ? "session" : "sessions"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/create-quiz?quizId=${opened.id}`}
                      className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
                    >
                      Edit
                    </Link>
                    <Button
                      type="button"
                      variant="accent"
                      disabled={
                        startingId === opened.id ||
                        opened._count.questions === 0
                      }
                      onClick={() => void startWaitingRoom(opened.id)}
                      title={
                        opened._count.questions === 0
                          ? "Add questions before starting"
                          : "Open host waiting room"
                      }
                    >
                      {startingId === opened.id ? "Starting…" : "Begin"}
                    </Button>
                  </div>
                </Card>
              </li>
            )}

            {rest.map((quiz) => (
              <li key={quiz.id}>
                <Card padding="md">
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-start justify-between gap-3 border-0 bg-transparent p-0 text-left"
                    onClick={() => setExpandedId(quiz.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="text-subhead font-medium">
                        {quiz.name}
                      </strong>
                      {quiz.description && (
                        <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                          {quiz.description}
                        </p>
                      )}
                      <p className="text-caption mt-1 mb-0 text-ink-muted">
                        {quiz._count.questions} questions ·{" "}
                        {quiz._count.sessions} sessions
                      </p>
                    </div>
                  </button>
                </Card>
              </li>
            ))}
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
