"use client";

import { Eyebrow } from "@/components/ui";

type Props = {
  sessionCode: string;
  participantName: string;
  participantCount: number;
  /** Host vs participant copy */
  variant?: "participant" | "host";
};

/**
 * Pre-first-question lobby on the live route.
 */
export function LobbyWaiting({
  sessionCode,
  participantName,
  participantCount,
  variant = "participant",
}: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Eyebrow tone="sage">Polloye</Eyebrow>
      <p className="text-mono m-0 text-[28px] tracking-wide text-ink sm:text-[40px]">
        {sessionCode}
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-headline m-0 text-ink">
          {variant === "host" ? "Waiting room" : "You're in"}
        </h1>
        <p className="text-body m-0 text-ink-muted">
          {variant === "host"
            ? "Share the join link, then show the first question."
            : "Waiting for host to start…"}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body-sm m-0 text-ink">{participantName}</p>
        <p className="text-mono m-0 text-ink-subtle">
          {participantCount} {participantCount === 1 ? "player" : "players"}
        </p>
      </div>
    </div>
  );
}
