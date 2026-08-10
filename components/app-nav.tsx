"use client";

import { type CSSProperties, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cx } from "@/components/ui";
import { PolloyeLogo } from "@/components/polloye-logo";

type Props = {
  children?: ReactNode;
  onSignOut?: () => void;
};

const LINKS = [
  { href: "/create-quiz", label: "Create Quiz" },
  { href: "/dashboard#join", label: "Join Quiz" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/conducted-quizzes", label: "Conducted Quiz" },
  { href: "/participated-quizzes", label: "Participated Quiz" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard#join") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ children, onSignOut }: Props) {
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

  function handleJoinQuizClick(e: MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/dashboard") {
      e.preventDefault();
      window.location.hash = "join";
      window.dispatchEvent(new Event("polloye:open-join"));
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-transparent">
      <div className="relative flex min-h-[52px] items-start justify-center px-4 pt-0 md:px-6">
        <div
          className={cx(
            "notch-nav relative z-10 flex flex-col",
            menuOpen ? "notch-nav-open" : "notch-nav-collapsed",
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 md:px-6 md:py-3.5">
            <Link
              href="/dashboard"
              className="shrink-0 text-canvas no-underline"
              aria-label="Polloye home"
            >
              <PolloyeLogo className="h-[31px] sm:h-[34px]" />
            </Link>

            <nav
              className="ml-2 hidden items-center gap-1 lg:flex lg:gap-1.5 xl:gap-2"
              aria-label="Main"
            >
              {LINKS.map((link) => {
                const active = linkActive(pathname, link.href);
                const isJoin = link.href === "/dashboard#join";
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={isJoin ? handleJoinQuizClick : undefined}
                    className={cx(
                      "notch-link relative whitespace-nowrap px-2.5 py-1 text-[13px] font-medium no-underline xl:text-[14px]",
                      active
                        ? "notch-link-active rounded-full bg-canvas text-ink"
                        : "text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:hidden">
              {children}
              <button
                type="button"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-ink/80 hover:bg-ink/10 hover:text-ink"
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

            {children && <div className="ml-auto hidden lg:block">{children}</div>}
          </div>

          {/* Mobile panel — height animates inside the notch */}
          <div
            id="app-nav-mobile"
            className="notch-nav-panel lg:hidden"
            aria-hidden={!menuOpen}
          >
            <div className="notch-nav-panel-inner">
              <nav className="flex flex-col gap-1 px-3 pb-4" aria-label="Mobile">
                {LINKS.map((link) => {
                  const isJoin = link.href === "/dashboard#join";
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={isJoin ? handleJoinQuizClick : undefined}
                      className={cx(
                        "rounded-full px-3 py-2.5 text-body-sm font-medium no-underline",
                        linkActive(pathname, link.href)
                          ? "bg-canvas text-ink"
                          : "text-ink hover:bg-ink/10",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="absolute top-3.5 right-3 z-20 inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface-1 px-3.5 py-1.5 text-[13px] font-semibold text-ink shadow-sm transition-colors hover:bg-surface-2 sm:right-5 md:right-6"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
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
