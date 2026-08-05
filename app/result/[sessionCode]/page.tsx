"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { LeaderboardList, type LeaderboardRow } from "@/components/live";
import { Card, Eyebrow } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: raw } = use(params);
  const sessionCode = raw.toUpperCase();
  const { data: authSession } = authClient.useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [quizName, setQuizName] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    fetch(`/api/session/${sessionCode}/results`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        setQuizName(data.session.quiz.name);
        setRows(
          (data.session.leaderboard as Array<{
            id: string;
            participantName: string;
            totalScore: number;
          }>).map((row) => ({
            participant_id: row.id,
            participant_name: row.participantName,
            total_score: row.totalScore,
          })),
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionCode]);

  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-5 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow tone="sage">Polloye</Eyebrow>
          <p className="text-mono m-0 text-ink-subtle">{sessionCode}</p>
          <h1 className="text-headline m-0">
            {loading ? "Results" : quizName || "Results"}
          </h1>
          <p className="text-body-sm m-0 text-ink-muted">Final standings</p>
        </div>

        <Card padding="lg">
          {loading && (
            <p className="text-body-sm m-0 text-ink-muted">Loading…</p>
          )}
          {!loading && !error && <LeaderboardList rows={rows} />}
          {error && (
            <p className="text-caption m-0 text-semantic-error" role="alert">
              {error}
            </p>
          )}
        </Card>

        {authSession && (
          <Link
            href="/dashboard"
            className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-1 px-[18px] py-2.5 text-button text-ink hover:bg-surface-2"
          >
            Back to dashboard
          </Link>
        )}
      </div>
    </main>
  );
}
