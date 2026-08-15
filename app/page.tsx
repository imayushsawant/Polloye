"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PolloyeLogo } from "@/components/polloye-logo";

/**
 * Polloye marketing landing page.
 * Built against DESIGN.md tokens: cream canvas (#f5f1ec), charcoal primary (#111111),
 * sage green (#7BA05B) reserved for brand CTAs / live-session highlights only.
 */

const FEATURES = [
  {
    title: "Quiz builder",
    body: "MCQ, multi-select, and true/false questions with custom scoring and optional images per option.",
  },
  {
    title: "Per-question timers",
    body: "Set a different time limit for every question — a 5-second lightning round or a 2-minute deep cut.",
  },
  {
    title: "Live hosting",
    body: "Socket.IO-powered play with sub-second sync. Share a 6-character code, players join, you control the pace.",
  },
  {
    title: "Guest or account play",
    body: "Join with just a nickname, or sign in to keep a history of every session you've played or hosted.",
  },
  {
    title: "Results & analytics",
    body: "Bar, pie, and donut breakdowns after every session, plus attendance time-window tracking for organizers.",
  },
  {
    title: "Share & import",
    body: "Every quiz gets a sharing code. Anyone can clone it straight into their own library and run their own session.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Build the quiz",
    body: "Write your questions, set timers and scoring, drop in images where they help.",
  },
  {
    n: "02",
    title: "Share the code",
    body: "Start a session and hand out a 6-character code. Players join in seconds, no install required.",
  },
  {
    n: "03",
    title: "Host it live",
    body: "Advance questions from the host view, watch answers land in real time, review the leaderboard after.",
  },
];

const FAQS = [
  {
    q: "Do players need an account?",
    a: "No. Anyone can join a session with a nickname as a guest. Signing in just keeps a history of quizzes you've hosted or played.",
  },
  {
    q: "How does scoring handle late answers?",
    a: "Score decays with response time on a server-authoritative curve, so faster correct answers are worth more — no client can fake a submit time.",
  },
  {
    q: "What happens if the host disconnects mid-session?",
    a: "The session runs an autonomous fallback: the current question auto-reveals and the game auto-advances, so a dropped host connection doesn't strand the room.",
  },
  {
    q: "Can I reuse someone else's quiz?",
    a: "Yes — every quiz has a sharing code. Import it into your own library and run your own session from it.",
  },
];

const TIMER_MAX = 12; // seconds shown in the demo

function TimerRing({ seconds, max }: { seconds: number; max: number }) {
  const pct = (seconds / max) * 100;
  const r = 26;
  const c = 2 * Math.PI * r;
  // colour shifts red when ≤ 3 s left
  const stroke = seconds <= 3 ? "#ef4444" : "#7BA05B";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#ebe7e1" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
      />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontFamily="SaansMono, ui-monospace" fill="#111111">
        {seconds}
      </text>
    </svg>
  );
}

function LiveQuizMockup() {
  const options = [
    { label: "Hash map", correct: true },
    { label: "Binary tree", correct: false },
    { label: "Linked list", correct: false },
    { label: "Stack", correct: false },
  ];

  const [secondsLeft, setSecondsLeft] = useState(TIMER_MAX);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Timer — counts down, restarts at 0 until the user selects
  useEffect(() => {
    if (revealed) return; // stop once answered
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return TIMER_MAX; // restart
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [revealed]);

  function handleSelect(label: string) {
    if (revealed) return;
    const opt = options.find((o) => o.label === label)!;
    setSelected(label);
    setRevealed(true);
    // Score: correct answer earns points proportional to time left (max 1000)
    if (opt.correct) {
      setScore(Math.round((secondsLeft / TIMER_MAX) * 1000));
    } else {
      setScore(0);
    }
  }

  function handleReset() {
    setSelected(null);
    setRevealed(false);
    setScore(null);
    setSecondsLeft(TIMER_MAX);
  }

  function optionClass(o: { label: string; correct: boolean }) {
    const base = "rounded-[8px] border px-4 py-3 text-[15px] cursor-pointer select-none transition-all duration-200 ";
    if (!revealed) {
      // Before answer: highlight on hover, mark pre-selected
      return base + (selected === o.label
        ? "border-[#7BA05B] bg-[#7BA05B]/10 text-[#111111] scale-[1.02] shadow-sm"
        : "border-[#d3cec6] text-[#626260] hover:border-[#7BA05B]/60 hover:bg-[#7BA05B]/5 hover:text-[#111111]");
    }
    // After reveal
    if (o.correct) return base + "border-[#7BA05B] bg-[#7BA05B]/12 text-[#111111]";
    if (o.label === selected) return base + "border-[#ef4444] bg-[#ef4444]/8 text-[#111111]";
    return base + "border-[#d3cec6] text-[#9c9fa5] opacity-60";
  }

  return (
    <div className="rounded-[16px] bg-white border border-[#d3cec6] p-6 sm:p-8 shadow-none">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] tracking-tight text-[#111111] bg-[#f5f1ec] border border-[#d3cec6] rounded-[6px] px-2.5 py-1">
            CODE&nbsp;7F3K9Q
          </span>
          <span className="text-[12px] text-[#7b7b78]">Question 4 of 10</span>
        </div>
        <TimerRing seconds={revealed ? secondsLeft : secondsLeft} max={TIMER_MAX} />
      </div>

      <p className="text-[18px] leading-[1.5] tracking-[-0.1px] text-[#111111] mb-6">
        Which data structure gives O(1) average lookup for an LRU cache?
      </p>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => handleSelect(o.label)}
            disabled={revealed}
            className={optionClass(o)}
          >
            <span className="flex items-center gap-2">
              {revealed && o.correct && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M2 7l3.5 3.5L12 4" stroke="#7BA05B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {revealed && !o.correct && o.label === selected && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M3 3l8 8M11 3L3 11" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {o.label}
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-[12px] text-[#9c9fa5]">
        {!revealed ? (
          <>
            <span>32 of 41 answered</span>
            <span className="text-[#7b7b78] italic">← try clicking an option</span>
          </>
        ) : (
          <>
            <span className={score! > 0 ? "text-[#7BA05B] font-medium" : "text-[#ef4444] font-medium"}>
              {score! > 0
                ? `+${score} pts — nice, ${Math.round((secondsLeft / TIMER_MAX) * 100)}% time left!`
                : "Incorrect — no points this time"}
            </span>
            <button
              onClick={handleReset}
              className="text-[12px] text-[#7b7b78] underline hover:text-[#111111] transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LeaderboardMockup() {
  const rows = [
    { name: "amara", score: 4820, color: "#7BA05B" },
    { name: "devon", score: 4390, color: "#65b5ff" },
    { name: "priya", score: 3960, color: "#b3e01c" },
    { name: "leo", score: 3510, color: "#ff2067" },
  ];
  const max = rows[0].score;
  return (
    <div className="rounded-[16px] bg-white border border-[#d3cec6] p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[15px] font-medium text-[#111111]">Leaderboard</span>
        <span className="text-[12px] text-[#9c9fa5]">After question 10</span>
      </div>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-4 text-[13px] text-[#9c9fa5] font-mono">{i + 1}</span>
            <div className="w-8 h-8 rounded-full bg-[#f5f1ec] border border-[#d3cec6] flex items-center justify-center text-[12px] text-[#626260] shrink-0">
              {r.name[0].toUpperCase()}
            </div>
            <span className="w-16 text-[14px] text-[#111111] shrink-0">{r.name}</span>
            <div className="flex-1 h-2 rounded-full bg-[#f5f1ec] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.score / max) * 100}%`, backgroundColor: r.color }}
              />
            </div>
            <span className="w-12 text-right text-[13px] font-mono text-[#626260]">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full text-left bg-[#f5f1ec] rounded-[8px] px-6 py-5 border-b border-[#ebe7e1] last:border-b-0"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-[16px] text-[#111111]">{q}</span>
        <span
          className={`shrink-0 text-[#7b7b78] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </div>
      {open && <p className="mt-3 text-[14px] leading-[1.5] text-[#626260] max-w-[560px]">{a}</p>}
    </button>
  );
}

/** Landing-page nav — same notch-nav pill as AppNav, adapted for public links. */
function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="nav-backdrop sticky top-0 z-20">
      <div className="relative flex min-h-[52px] items-start justify-center px-4 pt-0 md:px-6">
        {/* Notch pill */}
        <div
          className={`notch-nav relative z-10 flex flex-col ${menuOpen ? "notch-nav-open" : "notch-nav-collapsed"}`}
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 md:px-6 md:py-3.5">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 text-on-primary no-underline"
              aria-label="Polloye home"
            >
              <PolloyeLogo className="h-[31px] sm:h-[34px]" />
            </Link>

            {/* Desktop nav links */}
            <nav className="ml-2 hidden items-center gap-0.5 lg:flex lg:gap-1" aria-label="Landing">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="notch-link relative whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium no-underline transition-all duration-200 xl:text-[14px] text-on-primary/85 hover:text-on-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Mobile hamburger */}
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <button
                type="button"
                className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full text-on-primary/80 transition-colors hover:bg-on-primary/10 hover:text-on-primary"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="landing-nav-mobile"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
                    <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile panel */}
          <div id="landing-nav-mobile" className="notch-nav-panel lg:hidden" aria-hidden={!menuOpen}>
            <div className="notch-nav-panel-inner">
              <nav className="flex flex-col gap-0.5 px-3 pb-4" aria-label="Mobile landing">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full px-3 py-2.5 text-body-sm font-medium no-underline transition-colors text-on-primary/85 hover:bg-on-primary/10 hover:text-on-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Log in + Sign up — always top-right, outside the notch */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 sm:right-5 md:right-6">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center rounded-full border border-on-primary/15 bg-surface-1 px-3.5 py-1.5 text-[13px] font-medium text-ink transition-all duration-200 hover:bg-surface-2"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-sage px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <main className="bg-[#f5f1ec] text-[#111111] font-sans">
      <LandingNav />

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 pt-20 pb-24">
        <div className="max-w-[720px]">
          <span className="text-[14px] font-medium text-[#626260]">Live quiz platform</span>
          <h1 className="mt-4 text-[44px] sm:text-[64px] leading-[1.05] tracking-[-1.8px] font-medium">
            Run a live quiz your room actually pays attention to.
          </h1>
          <p className="mt-6 text-[18px] leading-[1.5] tracking-[-0.1px] text-[#626260] max-w-[520px]">
            Build a quiz, share a 6-character code, and watch answers land in
            real time. Built for classrooms, meetups, and team sessions —
            not a slide deck with a timer bolted on.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="bg-[#7BA05B] text-white text-[15px] font-medium rounded-[8px] px-[18px] py-[10px] hover:opacity-90 transition-opacity"
            >
              Create a quiz
            </Link>
            <a
              href="https://github.com/imayushsawant/Polloye"
              className="bg-white text-[#111111] text-[15px] font-medium rounded-[8px] px-[18px] py-[10px] border border-[#d3cec6] hover:border-[#111111] transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="mt-16">
          <LiveQuizMockup />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-[1280px] mx-auto px-6 py-24 border-t border-[#ebe7e1]">
        <div className="max-w-[560px] mb-14">
          <span className="text-[14px] font-medium text-[#626260]">Features</span>
          <h2 className="mt-3 text-[32px] sm:text-[40px] leading-[1.15] tracking-[-0.8px] font-medium">
            Everything a live session needs, nothing it doesn't.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-[#d3cec6] rounded-[12px] p-6">
              <h3 className="text-[20px] font-medium tracking-[-0.3px]">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#626260]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-[1280px] mx-auto px-6 py-24 border-t border-[#ebe7e1]">
        <div className="max-w-[560px] mb-14">
          <span className="text-[14px] font-medium text-[#626260]">How it works</span>
          <h2 className="mt-3 text-[32px] sm:text-[40px] leading-[1.15] tracking-[-0.8px] font-medium">
            Three steps, no app to install.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-[13px] text-[#9c9fa5]">{s.n}</span>
              <h3 className="mt-3 text-[22px] font-medium tracking-[-0.3px]">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#626260]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Results / analytics */}
      <section className="max-w-[1280px] mx-auto px-6 py-24 border-t border-[#ebe7e1]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[14px] font-medium text-[#626260]">Results &amp; analytics</span>
            <h2 className="mt-3 text-[32px] sm:text-[40px] leading-[1.15] tracking-[-0.8px] font-medium">
              See who showed up, and who actually knew the answers.
            </h2>
            <p className="mt-4 text-[16px] leading-[1.5] text-[#626260] max-w-[440px]">
              Every session ends with a full breakdown — per-question
              accuracy, response-time scoring, and an attendance
              time-window view so organizers can see participation, not
              just final scores.
            </p>
          </div>
          <LeaderboardMockup />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-[1280px] mx-auto px-6 py-24 border-t border-[#ebe7e1]">
        <div className="max-w-[560px] mb-10">
          <span className="text-[14px] font-medium text-[#626260]">FAQ</span>
          <h2 className="mt-3 text-[32px] sm:text-[40px] leading-[1.15] tracking-[-0.8px] font-medium">
            Good to know before you start.
          </h2>
        </div>
        <div className="max-w-[720px] bg-white border border-[#d3cec6] rounded-[12px] overflow-hidden">
          {FAQS.map((f) => (
            <FaqRow key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="bg-white border border-[#d3cec6] rounded-[24px] px-8 py-12 sm:px-16 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <h2 className="text-[28px] leading-[1.2] tracking-[-0.5px] font-medium max-w-[440px]">
            Your first live quiz can be running in under five minutes.
          </h2>
          <Link
            href="/register"
            className="bg-[#7BA05B] text-white text-[15px] font-medium rounded-[8px] px-[18px] py-[10px] hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Create a quiz
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f1ec] border-t border-[#ebe7e1] px-6 py-16">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Logo in footer — charcoal (currentColor on light bg) */}
          <PolloyeLogo className="h-[22px] text-[#111111]" />
          <div className="flex items-center gap-6 text-[12px] text-[#7b7b78]">
            <a href="https://github.com/imayushsawant/Polloye" className="hover:text-[#111111] transition-colors">
              GitHub
            </a>
            <a href="#features" className="hover:text-[#111111] transition-colors">
              Features
            </a>
            <a href="#faq" className="hover:text-[#111111] transition-colors">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
