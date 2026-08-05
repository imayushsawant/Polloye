"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { Badge, Card, EmptyState, Eyebrow } from "@/components/ui";

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

export default function ConductedQuizzesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [rows, setRows] = useState<ConductedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conducted-quizzes");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setRows(data.conducted ?? []);
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
          <h1 className="text-display-md m-0 text-ink">Conducted quizzes</h1>
          <p className="text-body m-0 text-ink-muted">
            Live sessions you’ve hosted from your quiz templates.
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
            title="No sessions hosted yet"
            description="Start a waiting room from one of your quiz templates."
            action={
              <Link
                href="/quizzes"
                className={`${linkBtn} bg-sage text-on-primary hover:opacity-90`}
              >
                Begin from quizzes
              </Link>
            }
          />
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {rows.map((s) => (
              <li key={s.id}>
                <Card
                  padding="md"
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-subhead font-medium">
                        {s.quiz.name}
                      </strong>
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
      </main>
    </div>
  );
}
