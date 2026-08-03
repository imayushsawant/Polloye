"use client";

import {
  type CSSProperties,
  type FormEvent,
  use,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
  const [status, setStatus] = useState("Checking session…");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [sessionState, setSessionState] = useState<string | null>(null);

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
        setStatus(
          `Lobby · ${data.session.participantCount} joined · state ${data.session.state}`,
        );

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
    try {
      const res = await fetch(`/api/session/${sessionCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Join failed");
        return;
      }
      saveParticipantSession(sessionCode, {
        token: data.token,
        participantId: data.participant.id,
        participantName: data.participant.participantName,
      });
      setJoined(true);
      setStatus("Joined waiting room. Waiting for host to start…");
      if (data.session.state === "ACTIVE") {
        router.replace(`/quiz/${sessionCode}`);
      }
    } catch {
      setError("Join failed");
    }
  }

  return (
    <main style={page}>
      <h1>Join quiz</h1>
      <p>
        Code: <code>{sessionCode}</code>
      </p>
      <p>{status}</p>
      {!joined && (
        <form onSubmit={onJoin} style={card}>
          <label style={label}>
            Nickname
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
              required
            />
          </label>
          <button type="submit" disabled={sessionState === "FINISHED"}>
            Enter waiting room
          </button>
        </form>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 480,
  margin: "40px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: CSSProperties = { display: "grid", gap: 12 };
const label: CSSProperties = { display: "grid", gap: 4 };
