"use client";

import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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

export function AppNav({ children, onTour, onSignOut }: Props) {
  const pathname = usePathname();

  async function defaultSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <header style={nav}>
      <Link href="/dashboard" style={brand}>
        Polloye
      </Link>
      <nav style={navLinks} aria-label="Main">
        {LINKS.map((link) => {
          const active =
            link.href === "/dashboard#join"
              ? false
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={active ? navLinkActive : navLink}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div style={navRight}>
        {children}
        {onTour && (
          <button type="button" style={btnGhost} onClick={onTour}>
            Tour
          </button>
        )}
        <button
          type="button"
          style={btnGhost}
          onClick={() => void (onSignOut ? onSignOut() : defaultSignOut())}
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

const nav: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  minHeight: 56,
  display: "flex",
  alignItems: "center",
  gap: 24,
  padding: "8px 24px",
  background: "var(--canvas)",
  borderBottom: "1px solid var(--hairline)",
  flexWrap: "wrap",
};

const brand: CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.3px",
  textDecoration: "none",
  color: "var(--ink)",
  flexShrink: 0,
};

const navLinks: CSSProperties = {
  display: "flex",
  gap: 20,
  flex: 1,
  flexWrap: "wrap",
  alignItems: "center",
};

const navLink: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--ink)",
  textDecoration: "none",
};

const navLinkActive: CSSProperties = {
  ...navLink,
  color: "var(--sage)",
};

const navRight: CSSProperties = {
  display: "flex",
  gap: 8,
  marginLeft: "auto",
  alignItems: "center",
};

const btnGhost: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2,
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid transparent",
  cursor: "pointer",
  background: "transparent",
  color: "var(--ink-muted)",
};
