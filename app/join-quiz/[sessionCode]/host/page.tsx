"use client";

import {
  type CSSProperties,
  use,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
  const [status, setStatus] = useState("Minting host token…");
  const [joining, setJoining] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

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
        sessionStorage.setItem(
          hostTokenStorageKey(sessionCode),
          data.token,
        );
        if (!cancelled) {
          setTokenReady(true);
          setStatus("Waiting room ready. Share the join link, then begin.");
        }
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
          // Already begun (e.g. refresh) — go to live host view
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

  if (isPending) return <main style={page}>Loading…</main>;

  return (
    <main style={page}>
      <h1>Host waiting room · {sessionCode}</h1>
      <p>{status}</p>
      <p>
        Players joined: <strong>{participantCount}</strong> · DB state:{" "}
        {sessionState}
      </p>
      <p>
        Participant link: <Link href={joinUrl}>{joinUrl || "…"}</Link>
      </p>
      {tokenReady && (
        <p style={{ color: "green" }}>Host token minted for this session.</p>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button
        type="button"
        disabled={!tokenReady || joining || sessionState === "FINISHED"}
        onClick={beginQuiz}
      >
        {joining ? "Loading quiz onto WS…" : "Begin quiz"}
      </button>
      <p style={{ fontSize: 14, color: "#555" }}>
        Begin sends the full quiz to the WS server memory, then opens the live
        host controls at <code>/quiz/{sessionCode}/host</code>.
      </p>
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: "40px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
