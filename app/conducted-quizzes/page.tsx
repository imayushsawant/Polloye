"use client";

import { type CSSProperties, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";

type ConductedRow = {
  id: string;
  sessionCode: string;
  state: string;
  conductedAt: string;
  participantCount: number;
  quiz: { id: string; name: string };
};

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
          <h1 style={title}>Conducted quizzes</h1>
          <p style={sub}>
            Live sessions you’ve hosted from your quiz templates.
          </p>
        </header>

        {error && <p style={errorText}>{error}</p>}

        {loading ? (
          <p style={muted}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={emptyCard}>
            <p style={{ margin: 0 }}>
              You haven’t hosted a session yet.{" "}
              <Link href="/quizzes" style={inlineLink}>
                Start a waiting room
              </Link>{" "}
              from one of your quizzes.
            </p>
          </div>
        ) : (
          <ul style={list}>
            {rows.map((s) => (
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
                  <Link
                    href={`/quiz/${s.sessionCode}/host`}
                    style={btnSecondary}
                  >
                    Resume host
                  </Link>
                )}
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

const pageHead: CSSProperties = { display: "grid", gap: 8 };

const title: CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: 500,
  letterSpacing: "-0.8px",
  lineHeight: 1.15,
};

const sub: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.5,
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

const rowTitle: CSSProperties = { fontSize: 18, fontWeight: 500 };

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

const muted: CSSProperties = { margin: 0, color: "var(--ink-muted)" };
const errorText: CSSProperties = { margin: 0, color: "#c41c1c" };
const inlineLink: CSSProperties = { color: "var(--ink)", fontWeight: 500 };

const btnSecondary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 500,
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid var(--hairline)",
  background: "var(--surface)",
  color: "var(--ink)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
