"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, cx } from "@/components/ui";

type Props = {
  children?: ReactNode;
  onTour?: () => void;
  onSignOut?: () => void;
};

const LINKS = [
  { href: "/create-quiz", label: "Create quiz" },
  { href: "/dashboard#join", label: "Join quiz" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/conducted-quizzes", label: "Conducted quizzes" },
  { href: "/participated-quizzes", label: "Participated quizzes" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard#join") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ children, onTour, onSignOut }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function defaultSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  function handleSignOut() {
    void (onSignOut ? onSignOut() : defaultSignOut());
  }

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas">
      <div className="flex min-h-14 items-center gap-4 px-4 md:gap-6 md:px-6">
        <Link
          href="/dashboard"
          className="shrink-0 text-[18px] font-medium tracking-[-0.3px] text-ink no-underline"
        >
          Polloye
        </Link>

        <nav
          className="hidden flex-1 flex-wrap items-center gap-5 md:flex"
          aria-label="Main"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "text-body-sm font-medium no-underline transition-colors",
                linkActive(pathname, link.href)
                  ? "text-sage"
                  : "text-ink hover:text-ink-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {children}
          {onTour && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={onTour}
            >
              Tour
            </Button>
          )}
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="hidden md:inline-flex"
            onClick={handleSignOut}
          >
            Sign out
          </Button>

          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-hairline bg-surface-1 text-ink md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="app-nav-mobile"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
                <path
                  d="M4 4l10 10M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="app-nav-mobile"
          className="border-t border-hairline bg-canvas px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-md px-3 py-3 text-body-sm font-medium no-underline",
                  linkActive(pathname, link.href)
                    ? "bg-surface-2 text-sage"
                    : "text-ink hover:bg-surface-2",
                )}
              >
                {link.label}
              </Link>
            ))}
            {onTour && (
              <button
                type="button"
                className="rounded-md px-3 py-3 text-left text-body-sm font-medium text-ink-muted hover:bg-surface-2"
                onClick={() => {
                  setMenuOpen(false);
                  onTour();
                }}
              >
                Tour
              </button>
            )}
            <button
              type="button"
              className="rounded-md px-3 py-3 text-left text-body-sm font-medium text-ink-muted hover:bg-surface-2"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

/** Thin layout helper — colors come from globals.css tokens. */
export const appShellVars: CSSProperties = {
  minHeight: "100vh",
  background: "var(--canvas)",
  color: "var(--ink)",
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};
