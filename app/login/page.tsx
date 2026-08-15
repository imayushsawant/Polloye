"use client";

import { type FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setSuccessMsg("Password reset successfully. You can now log in.");
    }
  }, []);

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
    router.push("/dashboard");
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
            Polloye
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
