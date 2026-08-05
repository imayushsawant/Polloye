"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Eyebrow } from "@/components/ui";

function hostTokenStorageKey(sessionCode: string) {
  return `polloye:host:${sessionCode.toUpperCase()}`;
}

function IconTrash({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
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
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Host waiting room — mint token here; Begin loads quiz into WS then goes live. */
export default function HostWaitingRoomPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: rawCode } = use(params);
  const sessionCode = rawCode.toUpperCase();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [participantCount, setParticipantCount] = useState(0);
  const [sessionState, setSessionState] = useState<string>("INACTIVE");
  const [tokenReady, setTokenReady] = useState(false);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [scrapping, setScrapping] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join-quiz/${sessionCode}`);
  }, [sessionCode]);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function mintToken() {
      try {
        const res = await fetch(`/api/join-quiz/${sessionCode}/host-token`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Failed to mint host token");
          return;
        }
        sessionStorage.setItem(hostTokenStorageKey(sessionCode), data.token);
        if (!cancelled) setTokenReady(true);
      } catch {
        if (!cancelled) setError("Failed to mint host token");
      }
    }

    async function poll() {
      try {
        const res = await fetch(`/api/session/${sessionCode}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Session not found");
          return;
        }
        if (cancelled) return;
        setParticipantCount(data.session.participantCount ?? 0);
        setSessionState(data.session.state);
        if (data.session.state === "ACTIVE") {
          router.replace(`/quiz/${sessionCode}/host`);
        }
      } catch {
        if (!cancelled) setError("Failed to poll session");
      }
    }

    void mintToken();
    void poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isPending, session, sessionCode, router]);

  async function copyJoinUrl() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  async function scrapSession() {
    if (scrapping) return;
    const ok = window.confirm(
      "Scrap this waiting room? Players will no longer be able to join this code.",
    );
    if (!ok) return;

    setError("");
    setScrapping(true);
    try {
      const res = await fetch(`/api/session/${sessionCode}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to scrap session");
        setScrapping(false);
        return;
      }
      sessionStorage.removeItem(hostTokenStorageKey(sessionCode));
      router.replace("/quizzes");
    } catch {
      setError("Failed to scrap session");
      setScrapping(false);
    }
  }

  async function beginQuiz() {
    setError("");
    setJoining(true);
    try {
      const res = await fetch(`/api/join-quiz/${sessionCode}/begin`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to begin quiz");
        setJoining(false);
        return;
      }
      router.push(`/quiz/${sessionCode}/host`);
    } catch {
      setError("Failed to begin quiz");
      setJoining(false);
    }
  }

  if (isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <p className="text-body text-ink-muted">Loading…</p>
      </main>
    );
  }

  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(joinUrl)}`
    : "";

  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-5 py-10">
      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-8">
        <button
          type="button"
          className="absolute top-0 right-0 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-semantic-error disabled:opacity-40"
          aria-label="Scrap session"
          title="Scrap session"
          disabled={scrapping || sessionState === "FINISHED"}
          onClick={() => void scrapSession()}
        >
          <IconTrash />
        </button>

        <div className="flex flex-col gap-3 pr-12">
          <Eyebrow tone="sage">Polloye</Eyebrow>
          <h1 className="text-headline m-0">Waiting room</h1>
          <p className="text-body m-0 text-ink-muted">
            Share the code or link so players can join.
          </p>
        </div>

        <Card padding="lg" className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-eyebrow m-0 text-ink-muted">Join code</p>
            <p className="text-mono m-0 text-[64px] font-medium leading-none tracking-[0.18em] text-ink sm:text-[80px]">
              {sessionCode}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline pt-5">
            <p className="text-eyebrow m-0 text-ink-muted">Join link</p>
            <div className="flex items-center gap-2">
              <p className="text-body-sm m-0 min-w-0 flex-1 break-all text-ink">
                {joinUrl || "…"}
              </p>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-md border border-hairline bg-surface-1 text-ink-muted transition-colors hover:text-ink"
                aria-label={copied ? "Copied" : "Copy join link"}
                title={copied ? "Copied" : "Copy join link"}
                onClick={() => void copyJoinUrl()}
              >
                {copied ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
          </div>

          {qrSrc && (
            <div className="flex flex-col items-center gap-3 border-t border-hairline pt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR code to join ${sessionCode}`}
                width={180}
                height={180}
                className="rounded-md border border-hairline bg-surface-1"
              />
              <p className="text-caption m-0 text-ink-subtle">
                Scan to open the join page
              </p>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <p className="text-mono m-0 text-ink-muted">
            {participantCount}{" "}
            {participantCount === 1 ? "player joined" : "players joined"}
          </p>

          <Button
            variant="accent"
            className="w-full"
            disabled={!tokenReady || joining || sessionState === "FINISHED"}
            onClick={() => void beginQuiz()}
          >
            {joining ? "Starting…" : "Begin quiz"}
          </Button>

          {error && (
            <p className="text-caption m-0 text-semantic-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
