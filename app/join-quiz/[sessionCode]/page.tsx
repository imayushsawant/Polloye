"use client";

import { type FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Eyebrow, Input } from "@/components/ui";
import { saveParticipantSession } from "@/lib/ws-client";

export default function JoinQuizPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: rawCode } = use(params);
  const sessionCode = rawCode.toUpperCase();
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sessionState, setSessionState] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/session/${sessionCode}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Session not found");
          return;
        }
        if (cancelled) return;
        setSessionState(data.session.state);
        setParticipantCount(data.session.participantCount ?? 0);
        setError("");

        if (data.session.state === "ACTIVE" && joined) {
          router.replace(`/quiz/${sessionCode}`);
          return;
        }
        if (data.session.state === "FINISHED") {
          router.replace(`/result/${sessionCode}`);
        }
      } catch {
        if (!cancelled) setError("Failed to reach session");
      }
    }

    void poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionCode, joined, router]);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setJoining(true);
    try {
      const res = await fetch(`/api/session/${sessionCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Join failed");
        setJoining(false);
        return;
      }
      saveParticipantSession(sessionCode, {
        token: data.token,
        participantId: data.participant.id,
        participantName: data.participant.participantName,
      });
      setJoined(true);
      setJoining(false);
      if (data.session.state === "ACTIVE") {
        router.replace(`/quiz/${sessionCode}`);
      }
    } catch {
      setError("Join failed");
      setJoining(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Eyebrow tone="sage">Polloye</Eyebrow>
          <p className="text-mono m-0 text-[40px] tracking-wide text-ink sm:text-[56px]">
            {sessionCode}
          </p>
          <p className="text-body-sm m-0 text-ink-muted">
            {participantCount}{" "}
            {participantCount === 1 ? "player joined" : "players joined"}
          </p>
        </div>

        <Card padding="lg" className="flex flex-col gap-5">
          {joined ? (
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-card-title m-0">You're in the lobby</h1>
              <p className="text-body-sm m-0 text-ink-muted">
                Waiting for the host to begin…
              </p>
            </div>
          ) : (
            <form onSubmit={onJoin} className="flex flex-col gap-5">
              <h1 className="text-card-title m-0">Join quiz</h1>
              <Input
                label="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                required
                autoComplete="nickname"
                placeholder="Your display name"
                disabled={sessionState === "FINISHED"}
              />
              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={joining || sessionState === "FINISHED"}
              >
                {joining ? "Joining…" : "Join"}
              </Button>
            </form>
          )}

          {error && (
            <p className="text-caption m-0 text-semantic-error" role="alert">
              {error}
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
