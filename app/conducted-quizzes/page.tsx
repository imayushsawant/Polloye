"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { Button, Card, EmptyState, Eyebrow } from "@/components/ui";

type LeaderboardRow = {
  id: string;
  participantName: string;
  totalScore: number;
};

type ConductedRow = {
  id: string;
  sessionCode: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  participantCount: number;
  quiz: { id: string; name: string };
  topLeaderboard: LeaderboardRow[];
};

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** e.g. 8th July 2026 */
function formatLongDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `${ordinal(d.getDate())} ${month} ${d.getFullYear()}`;
}

/** Hour + minutes only */
function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return "Under 1 min";
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const linkBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-button no-underline transition-colors select-none";

function LeaderboardList({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-body-sm m-0 text-ink-muted">
        No participants scored in this session.
      </p>
    );
  }

  return (
    <ol className="m-0 grid list-decimal gap-2 p-0 pl-5">
      {rows.map((row) => (
        <li key={row.id} className="text-body text-ink marker:text-ink-muted">
          <span className="font-medium">{row.participantName}</span>
          <span className="text-mono text-ink-muted"> · {row.totalScore}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ConductedQuizzesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [rows, setRows] = useState<ConductedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<ConductedRow | null>(null);
  const [fullBoard, setFullBoard] = useState<LeaderboardRow[] | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

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

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setFullBoard(null);
        setBoardError("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  async function loadFullLeaderboard(sessionCode: string) {
    setLoadingBoard(true);
    setBoardError("");
    try {
      const res = await fetch(`/api/session/${sessionCode}/results`);
      const data = await res.json();
      if (!res.ok) {
        setBoardError(data.error ?? "Failed to load leaderboard");
        return;
      }
      setFullBoard(data.session?.leaderboard ?? []);
    } catch {
      setBoardError("Failed to load leaderboard");
    } finally {
      setLoadingBoard(false);
    }
  }

  function openSession(row: ConductedRow) {
    setSelected(row);
    setFullBoard(null);
    setBoardError("");
    setShareCopied(false);
  }

  function closeModal() {
    setSelected(null);
    setFullBoard(null);
    setBoardError("");
    setShareCopied(false);
  }

  async function shareResults(sessionCode: string) {
    const url = `${window.location.origin}/result/${sessionCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setBoardError("Could not copy results link");
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

  const showingFull = fullBoard != null;

  return (
    <div style={appShellVars}>
      <AppNav />
      <main className="mx-auto grid max-w-[900px] gap-6 px-6 pb-24 pt-12">
        <header className="grid gap-2">
          <Eyebrow>History</Eyebrow>
          <h1 className="text-display-md m-0 text-ink">Conducted quizzes</h1>
          <p className="text-body m-0 text-ink-muted">
            Finished live sessions you’ve hosted from your quiz templates.
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
            title="No finished sessions yet"
            description="Host a quiz to completion and it will show up here."
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
                <button
                  type="button"
                  onClick={() => openSession(s)}
                  className="w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                >
                  <Card
                    padding="md"
                    className="cursor-pointer transition-colors hover:border-ink"
                  >
                    <strong className="text-subhead font-medium">
                      {s.quiz.name}
                    </strong>
                    <p className="text-body-sm mt-2 mb-0 text-ink-muted">
                      <span className="text-ink">Start time</span>{" "}
                      {formatLongDate(s.startedAt)} · {formatClock(s.startedAt)}
                    </p>
                    <p className="text-caption mt-1 mb-0 text-ink-muted">
                      Duration {formatDuration(s.durationMs)} ·{" "}
                      {s.participantCount}{" "}
                      {s.participantCount === 1 ? "player" : "players"} · code{" "}
                      <code className="text-mono">{s.sessionCode}</code>
                    </p>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="presentation"
          onClick={closeModal}
        >
          {showingFull ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="leaderboard-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hairline bg-surface-1 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <Eyebrow>Results</Eyebrow>
                  <h2
                    id="leaderboard-title"
                    className="text-card-title m-0 text-ink"
                  >
                    Leaderboard
                  </h2>
                  <p className="text-body-sm m-0 text-ink-muted">
                    {selected.quiz.name}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Close"
                  title="Close"
                  onClick={closeModal}
                >
                  <IconClose />
                </button>
              </div>
              <LeaderboardList rows={fullBoard} />
            </div>
          ) : (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="conducted-session-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hairline bg-surface-1 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <Eyebrow>Session</Eyebrow>
                  <h2
                    id="conducted-session-title"
                    className="text-card-title m-0 text-ink"
                  >
                    {selected.quiz.name}
                  </h2>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Close"
                  title="Close"
                  onClick={closeModal}
                >
                  <IconClose />
                </button>
              </div>

              <dl className="mb-6 grid gap-3">
                <div>
                  <dt className="text-caption m-0 text-ink-muted">Start time</dt>
                  <dd className="text-body m-0 text-ink">
                    {formatLongDate(selected.startedAt)} ·{" "}
                    {formatClock(selected.startedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption m-0 text-ink-muted">End time</dt>
                  <dd className="text-body m-0 text-ink">
                    {selected.endedAt
                      ? `${formatLongDate(selected.endedAt)} · ${formatClock(selected.endedAt)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption m-0 text-ink-muted">Duration</dt>
                  <dd className="text-body m-0 text-ink">
                    {formatDuration(selected.durationMs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption m-0 text-ink-muted">Players</dt>
                  <dd className="text-body m-0 text-ink">
                    {selected.participantCount}
                  </dd>
                </div>
              </dl>

              <h3 className="text-subhead m-0 mb-3 font-medium">Leaderboard</h3>
              <div className="mb-4">
                <LeaderboardList rows={selected.topLeaderboard} />
              </div>

              {boardError && (
                <p
                  className="text-body-sm mb-3 text-semantic-error"
                  role="alert"
                >
                  {boardError}
                </p>
              )}

              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingBoard}
                  onClick={() => void loadFullLeaderboard(selected.sessionCode)}
                >
                  {loadingBoard ? "Loading…" : "Load entire leaderboard"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void shareResults(selected.sessionCode)}
                >
                  {shareCopied ? "Link copied" : "Share result"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
