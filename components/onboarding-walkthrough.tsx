"use client";

import { type CSSProperties, useEffect, useId, useState } from "react";

const STORAGE_KEY = "polloye:onboarding:done";

const STEPS = [
  {
    title: "Welcome to Polloye",
    body: "Polloye is a live quiz platform. Hosts run sessions in real time; players join with a short code and compete on speed and accuracy.",
  },
  {
    title: "Create a quiz",
    body: "Build a quiz with multiple-choice, multi-select, or true/false questions. Set scores and timers, then save it as a reusable template in My quizzes.",
  },
  {
    title: "Share & import",
    body: "Every quiz gets a 6-character sharing code. Share it so others can import a copy into their account, or import someone else’s template into yours.",
  },
  {
    title: "Host a live session",
    body: "From My quizzes, start a waiting room. Players join with the session code while you wait. When ready, begin the quiz and control reveal, next question, and leaderboard.",
  },
  {
    title: "Join a quiz",
    body: "Enter a live session code from Join quiz, pick a nickname, and play. Finished sessions keep your score under Participated quizzes when you’re signed in.",
  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function markOnboardingDone() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function OnboardingWalkthrough({ open, onClose }: Props) {
  const titleId = useId();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function finish() {
    markOnboardingDone();
    onClose();
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div style={modal}>
        <p style={eyebrow}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id={titleId} style={title}>
          {current.title}
        </h2>
        <p style={body}>{current.body}</p>

        <div style={dots} aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                ...dot,
                background: i === step ? "var(--sage)" : "var(--hairline)",
              }}
            />
          ))}
        </div>

        <div style={actions}>
          <button type="button" style={btnGhost} onClick={finish}>
            Skip
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                type="button"
                style={btnSecondary}
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button type="button" style={btnAccent} onClick={finish}>
                Got it
              </button>
            ) : (
              <button
                type="button"
                style={btnPrimary}
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(17, 17, 17, 0.45)",
  display: "grid",
  placeItems: "center",
  padding: 24,
};

const modal: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  padding: 32,
  display: "grid",
  gap: 16,
  boxSizing: "border-box",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  color: "var(--ink-muted)",
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.5px",
  lineHeight: 1.2,
  color: "var(--ink)",
};

const body: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.5,
  color: "var(--ink-muted)",
};

const dots: CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const dot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 9999,
};

const actions: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 8,
  flexWrap: "wrap",
};

const btnBase: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.2,
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid transparent",
  cursor: "pointer",
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: "var(--ink)",
  color: "#fff",
};

const btnAccent: CSSProperties = {
  ...btnBase,
  background: "var(--sage)",
  color: "#fff",
};

const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "var(--surface)",
  color: "var(--ink)",
  borderColor: "var(--hairline)",
};

const btnGhost: CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "var(--ink-muted)",
};
