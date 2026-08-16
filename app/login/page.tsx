"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";
import { PolloyeLogo } from "@/components/polloye-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectingRef = useRef(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setSuccessMsg("Password reset successfully. You can now log in.");
    }
    
    const err = params.get("error");
    if (err) {
      if (err === "account_not_linked" || err === "email_in_use" || err === "unable_to_link_account") {
        setError("An account with this email already exists. Please log in with your password.");
      } else {
        setError("Authentication failed. Please try again.");
      }
      // Remove the error from the URL so it doesn't persist on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Once the session is confirmed after a successful sign-in, navigate to dashboard.
  useEffect(() => {
    if (redirectingRef.current && !isPending && session) {
      router.replace("/dashboard");
    }
  }, [isPending, session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    if (signInError) {
      let errorMessage = signInError.message ?? "Sign in failed";
      if (errorMessage.includes("[body.")) {
        errorMessage = errorMessage.replace(/\[body\.[^\]]+\]\s*/g, "").trim();
      }
      setError(errorMessage);
      setSubmitting(false);
      return;
    }
    // Mark that we're waiting for the session to propagate before redirecting.
    // The useEffect watching `session` will do the actual navigation once
    // better-auth's useSession() reflects the new cookie — this avoids the
    // race condition where the dashboard reads a stale null session and
    // immediately bounces the user back to login.
    redirectingRef.current = true;
  }

  return (
    <main
      style={appShellVars}
      className="flex min-h-screen items-center justify-center px-6 py-12"
    >
      <Card className="w-full max-w-md" padding="xl">
        <div className="mb-8 flex flex-col gap-2">
          <Link
            href="/login"
            className="text-card-title text-ink no-underline tracking-[-0.3px]"
          >
            <PolloyeLogo />
          </Link>
          <h1 className="text-headline m-0 text-ink">Sign in</h1>
          <p className="text-body-sm m-0 text-ink-muted">
            Welcome back — host live quizzes or join a session.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 rounded-md bg-semantic-success-muted p-3">
            <p className="text-body-sm m-0 text-semantic-success">
              {successMsg}
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            autoComplete="email"
            required
          />
          <div className="flex flex-col gap-1">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
              minLength={8}
              required
            />
            <div className="flex justify-end">
              <Link 
                href="/forgot-password" 
                className="text-body-sm text-ink-muted hover:text-ink hover:underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          {error && (
            <p className="text-body-sm m-0 text-semantic-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-surface-sunken" />
          </div>
          <div className="relative flex justify-center text-body-xs uppercase">
            <span className="bg-surface-1 px-2 text-ink-muted">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full mt-6"
          onClick={async () => {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: "/dashboard",
              errorCallbackURL: "/auth-error",
            });
          }}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Google
        </Button>

        <p className="text-body-sm mt-6 mb-0 text-ink-muted">
          No account?{" "}
          <Link href="/register" className="font-medium text-ink underline-offset-2 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </main>
  );
}
