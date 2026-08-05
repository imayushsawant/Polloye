"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { appShellVars } from "@/components/app-nav";
import { Button, Card, Eyebrow } from "@/components/ui";

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
  const { data: session } = authClient.useSession();

  const [quiz, setQuiz] = useState<{
    name: string;
    description: string | null;
    quizSharingCode: string;
    _count: { questions: number };
  } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    fetch(`/api/share-quiz/${quizSharingCode}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        setQuiz(data.quiz);
      })
      .catch((err: Error) => setError(err.message));
  }, [quizSharingCode]);

  async function cloneQuiz() {
    if (!session) {
      router.push("/login");
      return;
    }
    setError("");
    setCloning(true);
    try {
      const res = await fetch(`/api/share-quiz/${quizSharingCode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Clone failed");
        setCloning(false);
        return;
      }
      setStatus(`Cloned as ${data.quiz.name}`);
      router.push("/create-quiz");
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
          <Eyebrow>Shared template</Eyebrow>
        </div>

        {quiz ? (
          <Card padding="xl" className="grid gap-4">
            <h1 className="text-headline m-0 text-ink">{quiz.name}</h1>
            <p className="text-body m-0 text-ink-muted">
              {quiz.description || "No description"}
            </p>
            <p className="text-body-sm m-0 text-ink-muted">
              Code{" "}
              <code className="text-mono text-ink">{quiz.quizSharingCode}</code>
              {" · "}
              {quiz._count.questions} questions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="accent"
                disabled={cloning}
                onClick={() => void cloneQuiz()}
              >
                {cloning
                  ? "Cloning…"
                  : session
                    ? "Clone to my account"
                    : "Sign in to clone"}
              </Button>
              <Link
                href={session ? "/create-quiz" : "/login"}
                className={`${linkBtn} border border-hairline bg-surface-1 text-ink hover:bg-surface-2`}
              >
                {session ? "Back to create quiz" : "Sign in"}
              </Link>
            </div>
          </Card>
        ) : !error ? (
          <Card padding="xl">
            <p className="text-body m-0 text-ink-muted">Loading…</p>
          </Card>
        ) : null}

        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}
        {status && <p className="text-body-sm m-0 text-sage">{status}</p>}
      </div>
    </main>
  );
}
