"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Eyebrow, Input, cx } from "@/components/ui";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Mid-screen popup to enter a live session code and join. */
export function JoinQuizModal({ open, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [code, setCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setCode("");
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      window.addEventListener("keydown", onKey);
      return () => {
        window.cancelAnimationFrame(id);
        window.removeEventListener("keydown", onKey);
      };
    }

    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = code.trim().toUpperCase();
    if (next.length < 4) return;
    onClose();
    router.push(`/join-quiz/${next}`);
  }

  if (!mounted) return null;

  const hasCode = code.trim().length > 0;

  return (
    <div
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 transition-opacity duration-200 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "w-full rounded-xl border border-hairline bg-surface-1 p-5",
          "transition-[max-width,transform,opacity,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          hasCode ? "max-w-sm p-6" : "max-w-[20rem]",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-[0.96] opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <Eyebrow tone="sage">Join</Eyebrow>
            <h2 id={titleId} className="text-card-title m-0 text-ink">
              Join a quiz
            </h2>
            <p className="text-body-sm m-0 text-ink-muted">
              Enter the session code from your host.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col">
          <Input
            label="Session code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ZL3943"
            maxLength={6}
            required
            autoFocus
            aria-label="Session code"
            className="font-mono tracking-wider uppercase"
          />

          {/* Height extends open to house the Join button */}
          <div
            className={cx(
              "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              hasCode
                ? "mt-4 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0",
            )}
            aria-hidden={!hasCode}
          >
            <div className="min-h-0 overflow-hidden">
              <Button
                type="submit"
                variant="accent"
                disabled={code.trim().length < 4}
                tabIndex={hasCode ? 0 : -1}
                className={cx(
                  "w-full bg-sage text-on-primary disabled:bg-sage disabled:opacity-100",
                  "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  hasCode ? "translate-y-0" : "-translate-y-1",
                )}
              >
                Join
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
