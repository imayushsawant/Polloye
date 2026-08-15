"use client";

import { type FormEvent, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";
import { PolloyeLogo } from "@/components/polloye-logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      let errorMessage = resetError.message ?? "Failed to reset password";
      if (errorMessage.includes("[body.")) {
        errorMessage = errorMessage.replace(/\[body\.[^\]]+\]\s*/g, "").trim();
      }
      setError(errorMessage);
      setSubmitting(false);
      return;
    }
    
    // Redirect to login page upon success
    router.push("/login?reset=success");
  }

  return (
    <Card className="w-full max-w-md" padding="xl">
      <div className="mb-8 flex flex-col gap-2">
        <Link
          href="/login"
          className="text-card-title text-ink no-underline tracking-[-0.3px]"
        >
          <PolloyeLogo />
        </Link>
        <h1 className="text-headline m-0 text-ink">Set new password</h1>
        <p className="text-body-sm m-0 text-ink-muted">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={!token}
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError("");
          }}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={!token}
        />
        {error && (
          <p className="text-body-sm m-0 text-semantic-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={submitting || !token} className="w-full mt-1">
          {submitting ? "Saving…" : "Save password"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      style={appShellVars}
      className="flex min-h-screen items-center justify-center px-6 py-12"
    >
      <Suspense fallback={
        <Card className="w-full max-w-md" padding="xl">
          <div className="flex h-32 items-center justify-center">
            <p className="text-body-sm text-ink-muted">Loading...</p>
          </div>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
