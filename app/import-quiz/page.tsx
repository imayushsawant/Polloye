"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { Button, Card, Eyebrow, Input } from "@/components/ui";

/** Enter a quiz sharing code, then continue to /share-quiz/[code]. */
export default function ImportQuizPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/login");
  }, [isPending, session, router]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = code.trim().toUpperCase();
    if (next.length < 6) {
      setError("Enter the full 6-character sharing code");
      return;
    }
    router.push(`/share-quiz/${encodeURIComponent(next)}`);
  }

  if (isPending || !session) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body m-0 text-ink-muted">Loading…</p>
      </main>
    );
  }

  return (
    <div style={appShellVars}>
      <AppNav onSignOut={() => void signOut()} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-6 py-12 md:py-16">
        <Card padding="xl" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Eyebrow tone="sage">Import</Eyebrow>
            <h1 className="text-headline m-0 text-ink">Import a quiz</h1>
            <p className="text-body-sm m-0 text-ink-muted">
              Paste a quiz sharing code to preview it, then clone it into your
              account.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Sharing code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError("");
              }}
              placeholder="ABC123"
              maxLength={6}
              required
              autoFocus
              aria-label="Quiz sharing code"
              className="font-mono tracking-wider uppercase"
            />

            {error && (
              <p className="text-body-sm m-0 text-semantic-error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="accent"
              disabled={code.trim().length < 6}
              className="w-fit bg-sage text-on-primary disabled:bg-sage disabled:opacity-100"
            >
              Continue
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
