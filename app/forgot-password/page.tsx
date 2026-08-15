"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";
import { PolloyeLogo } from "@/components/polloye-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (resetError) {
      let errorMessage = resetError.message ?? "Failed to request password reset";
      if (errorMessage.includes("[body.")) {
        errorMessage = errorMessage.replace(/\[body\.[^\]]+\]\s*/g, "").trim();
      }
      setError(errorMessage);
      setSubmitting(false);
      return;
    }
    
    setSuccess(true);
    setSubmitting(false);
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
          <h1 className="text-headline m-0 text-ink">Reset password</h1>
          <p className="text-body-sm m-0 text-ink-muted">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-md bg-surface-raised p-4">
              <p className="text-body-sm m-0 text-ink">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your inbox (and spam folder) and click the link to continue.
              </p>
            </div>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Return to sign in
              </Button>
            </Link>
          </div>
        ) : (
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
            {error && (
              <p className="text-body-sm m-0 text-semantic-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
              {submitting ? "Sending link…" : "Send reset link"}
            </Button>
            <Link href="/login" className="mt-2 text-center text-body-sm font-medium text-ink-muted hover:text-ink">
              Back to sign in
            </Link>
          </form>
        )}
      </Card>
    </main>
  );
}
