"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Badge, Button, Card, Eyebrow } from "@/components/ui";

function hostTokenStorageKey(sessionCode: string) {
  return `polloye:host:${sessionCode.toUpperCase()}`;
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
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow tone="sage">Polloye</Eyebrow>
            <Badge tone="phase">Host lobby</Badge>
          </div>
          <h1 className="text-headline m-0">Waiting room</h1>
          <p className="text-mono m-0 text-[28px] tracking-wide text-ink">
            {sessionCode}
          </p>
        </div>

        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="text-eyebrow m-0 text-ink-muted">Join link</p>
            <p className="text-body-sm m-0 break-all text-ink">{joinUrl || "…"}</p>
          </div>
          <Button variant="secondary" onClick={copyJoinUrl} className="w-full">
            {copied ? "Copied" : "Copy join link"}
          </Button>

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
            onClick={beginQuiz}
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
