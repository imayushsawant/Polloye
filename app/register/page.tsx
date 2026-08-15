"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";
import { PolloyeLogo } from "@/components/polloye-logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name,
    });
    if (signUpError) {
      let errorMessage = signUpError.message ?? "Sign up failed";
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
            <PolloyeLogo />
          </Link>
          <h1 className="text-headline m-0 text-ink">Create account</h1>
          <p className="text-body-sm m-0 text-ink-muted">
            Build quizzes, host live sessions, and keep your scores.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
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
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            autoComplete="new-password"
            minLength={8}
            pattern="^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$"
            required
            hint="At least 8 chars, 1 uppercase, 1 lowercase, 1 number"
          />
          {error && (
            <p className="text-body-sm m-0 text-semantic-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="text-body-sm mt-6 mb-0 text-ink-muted">
          Have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
