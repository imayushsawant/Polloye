"use client";

import {
  type FormEvent,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import {
  loadParticipantSession,
  saveParticipantSession,
} from "@/lib/ws-client";

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

type QuizInfo = {
  name: string;
  description: string | null;
  hostName: string;
};

function displayNameFromAccount(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Player";
  return trimmed.slice(0, 32);
}

export default function JoinQuizPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode: rawCode } = use(params);
  const sessionCode = rawCode.toUpperCase();
  const router = useRouter();
  const { data: authSession, isPending: authPending } = authClient.useSession();

  const [nickname, setNickname] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sessionState, setSessionState] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    const saved = loadParticipantSession(sessionCode);
    if (saved) {
      setJoined(true);
      setNickname(saved.participantName);
      setParticipantId(saved.participantId);
    }
  }, [sessionCode]);

  const joinWithName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 32);
      if (!trimmed) {
        setError("Nickname is required");
        return;
      }

      setError("");
      setJoining(true);
      try {
        const res = await fetch(`/api/session/${sessionCode}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantName: trimmed }),
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
        setNickname(data.participant.participantName);
        setParticipantId(data.participant.id);
        setJoined(true);
        setJoining(false);
        if (data.session.state === "ACTIVE") {
          router.replace(`/quiz/${sessionCode}`);
        }
      } catch {
        setError("Join failed");
        setJoining(false);
      }
    },
    [router, sessionCode],
  );

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
        if (data.session.quiz) {
          setQuiz({
            name: data.session.quiz.name,
            description: data.session.quiz.description ?? null,
            hostName: data.session.quiz.hostName ?? "Host",
          });
        }
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

  // Logged-in users: skip nickname form and join with account name.
  useEffect(() => {
    if (authPending || joined || joining || autoJoinAttempted.current) return;
    if (!authSession?.user) return;
    if (sessionState === null || sessionState === "FINISHED") return;

    autoJoinAttempted.current = true;
    void joinWithName(displayNameFromAccount(authSession.user.name));
  }, [
    authPending,
    authSession?.user,
    joined,
    joining,
    sessionState,
    joinWithName,
  ]);

  async function copyJoinLink() {
    const url = `${window.location.origin}/join-quiz/${sessionCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    await joinWithName(nickname);
  }

  function startEditNickname() {
    setNicknameDraft(nickname);
    setEditingNickname(true);
    setError("");
  }

  function cancelEditNickname() {
    setEditingNickname(false);
    setNicknameDraft("");
  }

  async function saveNickname() {
    if (!participantId) return;
    const next = nicknameDraft.trim().slice(0, 32);
    if (!next) {
      setError("Nickname is required");
      return;
    }
    if (next === nickname) {
      setEditingNickname(false);
      return;
    }

    setSavingNickname(true);
    setError("");
    try {
      const res = await fetch(`/api/session/${sessionCode}/nickname`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          participantName: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update nickname");
        setSavingNickname(false);
        return;
      }
      saveParticipantSession(sessionCode, {
        token: data.token,
        participantId: data.participant.id,
        participantName: data.participant.participantName,
      });
      setNickname(data.participant.participantName);
      setEditingNickname(false);
      setSavingNickname(false);
    } catch {
      setError("Could not update nickname");
      setSavingNickname(false);
    }
  }

  const isLoggedIn = Boolean(authSession?.user);
  const showGuestJoinForm =
    !joined && !isLoggedIn && !authPending && sessionState !== "FINISHED";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-12">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="m-0 text-[28px] font-medium tracking-[-0.5px] text-sage sm:text-[32px]">
            Polloye
          </p>
          <p className="text-mono m-0 text-[48px] font-medium leading-none tracking-[0.16em] text-ink sm:text-[64px]">
            {sessionCode}
          </p>
          <p className="text-body-sm m-0 text-ink-muted">
            {participantCount}{" "}
            {participantCount === 1 ? "player joined" : "players joined"}
          </p>
        </div>

        <Card padding="xl" className="flex flex-col gap-6">
          {(quiz || joined) && (
            <div className="grid gap-2 border-b border-hairline-soft pb-5">
              <h1 className="text-card-title m-0 text-ink">
                {quiz?.name ?? "Quiz"}
              </h1>
              {quiz?.description ? (
                <p className="text-body m-0 text-ink-muted">{quiz.description}</p>
              ) : null}
              <p className="text-body-sm m-0 text-ink-subtle">
                Hosted by{" "}
                <span className="font-medium text-ink">
                  {quiz?.hostName ?? "Host"}
                </span>
              </p>
            </div>
          )}

          {joined ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 text-center">
                <p className="text-card-title m-0">You&apos;re in the lobby</p>
                <p className="text-body-sm m-0 text-ink-muted">
                  Waiting for the host to begin…
                </p>
              </div>

              {!editingNickname ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p className="text-body-sm m-0 text-ink">
                    Playing as{" "}
                    <span className="font-medium">{nickname}</span>
                  </p>
                  <button
                    type="button"
                    className="text-caption min-h-8 rounded-md px-2 font-medium text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
                    onClick={startEditNickname}
                  >
                    Change nickname
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Input
                    label="Nickname"
                    value={nicknameDraft}
                    onChange={(e) => setNicknameDraft(e.target.value)}
                    maxLength={32}
                    required
                    autoComplete="nickname"
                    autoFocus
                    disabled={savingNickname}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="accent"
                      disabled={savingNickname || !nicknameDraft.trim()}
                      onClick={() => void saveNickname()}
                    >
                      {savingNickname ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={savingNickname}
                      onClick={cancelEditNickname}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface-1 text-ink transition-colors hover:bg-surface-2"
                aria-label={copied ? "Link copied" : "Copy join link to share"}
                title={copied ? "Link copied" : "Copy join link to share"}
                onClick={() => void copyJoinLink()}
              >
                {copied ? <IconCheck /> : <IconCopy />}
                <span className="text-button">
                  {copied ? "Link copied" : "Share with friends"}
                </span>
              </button>
            </div>
          ) : showGuestJoinForm ? (
            <form onSubmit={onJoin} className="flex flex-col gap-5">
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
          ) : sessionState === "FINISHED" ? (
            <p className="text-body m-0 text-center text-ink-muted">
              This session has finished.
            </p>
          ) : isLoggedIn ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-body m-0 text-center text-ink-muted">
                {joining
                  ? `Joining as ${displayNameFromAccount(authSession?.user?.name)}…`
                  : `Join as ${displayNameFromAccount(authSession?.user?.name)}`}
              </p>
              {!joining && error ? (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    autoJoinAttempted.current = false;
                    setError("");
                    autoJoinAttempted.current = true;
                    void joinWithName(
                      displayNameFromAccount(authSession?.user?.name),
                    );
                  }}
                >
                  Try again
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-body m-0 text-center text-ink-muted">
              {authPending ? "Checking account…" : "Loading…"}
            </p>
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
