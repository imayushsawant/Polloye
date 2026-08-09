"use client";

import { Eyebrow } from "@/components/ui";

type Props = {
  participantName: string;
};

/**
 * Shown when a participant joins (or reconnects) while a question is already live.
 * They are blocked from that question and wait for the next reveal.
 */
export function MidQuestionWaiting({ participantName }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
      <Eyebrow tone="sage">Almost there</Eyebrow>
      <div className="flex max-w-md flex-col gap-3">
        <h1 className="text-headline m-0 text-ink">
          You&apos;ll answer from the next question
        </h1>
        <p className="text-body m-0 text-ink-muted">
          A question is already in progress. Hang tight — you&apos;ll be able to
          play when the host moves on.
        </p>
      </div>
      <p className="text-body-sm m-0 text-ink-subtle">{participantName}</p>
    </div>
  );
}
