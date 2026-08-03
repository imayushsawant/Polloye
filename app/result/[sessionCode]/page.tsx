"use client";

import { type CSSProperties, use, useEffect, useState } from "react";

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: raw } = use(params);
  const sessionCode = raw.toUpperCase();
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<{
    session: {
      state: string;
      quiz: { name: string };
      leaderboard: Array<{
        id: string;
        participantName: string;
        totalScore: number;
      }>;
    };
  } | null>(null);

  useEffect(() => {
    fetch(`/api/session/${sessionCode}/results`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        setPayload(data);
      })
      .catch((err: Error) => setError(err.message));
  }, [sessionCode]);

  return (
    <main style={page}>
      <h1>Results · {sessionCode}</h1>
      {payload ? (
        <section style={card}>
          <h2>{payload.session.quiz.name}</h2>
          <p>State: {payload.session.state}</p>
          <ol>
            {payload.session.leaderboard.map((row) => (
              <li key={row.id}>
                {row.participantName}: {row.totalScore}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p>Loading…</p>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 560,
  margin: "40px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  display: "grid",
  gap: 12,
};
