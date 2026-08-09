"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { appShellVars } from "@/components/app-nav";
import { Button, Card, Eyebrow, Input } from "@/components/ui";

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

export default function ShareQuizPage({
  params,
}: {
  params: Promise<{ quizSharingCode: string }>;
}) {
  const { quizSharingCode: raw } = use(params);
  const quizSharingCode = raw.toUpperCase();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [quiz, setQuiz] = useState<{
    id: string;
    name: string;
    description: string | null;
    quizSharingCode: string;
    _count: { questions: number };
  } | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [error, setError] = useState("");
  const [cloning, setCloning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/share-quiz/${quizSharingCode}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        if (cancelled) return;

        if (data.isOwner) {
          router.replace(`/quizzes?open=${encodeURIComponent(data.quiz.id)}`);
          return;
        }

        setQuiz(data.quiz);
        setCloneName(data.quiz.name ?? "");
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [quizSharingCode, router]);

  async function cloneQuiz() {
    if (!session) {
      router.push("/login");
      return;
    }
    const name = cloneName.trim();
    if (!name) {
      setError("Enter a name for your copy");
      return;
    }

    setError("");
    setCloning(true);
    try {
      const res = await fetch(`/api/share-quiz/${quizSharingCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Clone failed");
        setCloning(false);
        return;
      }
      router.push(`/quizzes?open=${encodeURIComponent(data.quiz.id)}`);
    } catch {
      setError("Clone failed");
      setCloning(false);
    }
  }

  return (
    <main
      style={appShellVars}
      className="flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div className="grid w-full max-w-lg gap-6">
        <div className="grid gap-2 text-center sm:text-left">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="text-card-title text-ink no-underline tracking-[-0.3px]"
          >
            Polloye
          </Link>
          <Eyebrow>Shared quiz</Eyebrow>
        </div>

        {loading || isPending ? (
          <Card padding="xl">
            <p className="text-body m-0 text-ink-muted">Loading…</p>
          </Card>
        ) : quiz ? (
          <Card padding="xl" className="grid gap-4">
            <div className="grid gap-1">
              <h1 className="text-headline m-0 text-ink">{quiz.name}</h1>
              <p className="text-body m-0 text-ink-muted">
                {quiz.description || "No description"}
              </p>
              <p className="text-body-sm m-0 text-ink-muted">
                Code{" "}
                <code className="text-mono text-ink">{quiz.quizSharingCode}</code>
                {" · "}
                {quiz._count.questions}{" "}
                {quiz._count.questions === 1 ? "question" : "questions"}
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-body-sm font-medium text-ink">
              Name for your copy
              <Input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Quiz name"
                maxLength={120}
                required
                aria-label="Name for your copy"
                disabled={cloning}
              />
            </label>

            <div className="mt-1 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="accent"
                disabled={cloning || !cloneName.trim()}
                onClick={() => void cloneQuiz()}
              >
                {cloning
                  ? "Cloning…"
                  : session
                    ? "Clone to my account"
                    : "Sign in to clone"}
              </Button>
              <Link
                href={session ? "/quizzes" : "/login"}
                className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
              >
                {session ? "My quizzes" : "Sign in"}
              </Link>
            </div>
          </Card>
        ) : null}

        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
