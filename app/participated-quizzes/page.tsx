"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { Badge, Card, EmptyState, Eyebrow } from "@/components/ui";

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

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

export default function ParticipatedQuizzesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [rows, setRows] = useState<ParticipatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/participated-quizzes");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setRows(data.participated ?? []);
    } catch {
      setError("Failed to load");
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
    void load();
  }, [isPending, session, router, load]);

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

  return (
    <div style={appShellVars}>
      <AppNav />
      <main className="mx-auto grid max-w-[900px] gap-6 px-6 pb-24 pt-12">
        <header className="grid gap-2">
          <Eyebrow>History</Eyebrow>
          <h1 className="text-display-md m-0 text-ink">Participated quizzes</h1>
          <p className="text-body m-0 text-ink-muted">
            Sessions you joined while signed in. Guest joins without an account
            won’t appear here.
          </p>
        </header>

        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No participations yet"
            description="Join a live session with a session code from your host."
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
            {rows.map((p) => (
              <li key={p.id}>
                <Card
                  padding="md"
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-subhead font-medium">
                        {p.quiz.name}
                      </strong>
                      <Badge tone="phase">{p.session.state.toLowerCase()}</Badge>
                    </div>
                    {p.quiz.description && (
                      <p className="text-body-sm mt-1 mb-0 text-ink-muted">
                        {p.quiz.description}
                      </p>
                    )}
                    <p className="text-caption mt-1 mb-0 text-ink-muted">
                      As {p.participantName} · score{" "}
                      <span className="text-mono">{p.totalScore}</span> · code{" "}
                      <code className="text-mono">{p.session.sessionCode}</code> ·{" "}
                      {new Date(p.session.conductedAt).toLocaleString()}
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
      </main>
    </div>
  );
}
