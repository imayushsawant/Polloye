"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { appShellVars } from "@/components/app-nav";
import { PolloyeLogo } from "@/components/polloye-logo";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("An authentication error occurred.");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "account_not_linked" || err === "email_in_use" || err === "unable_to_link_account") {
      setErrorMessage("An account with this email address already exists and was created using a password. Please log in with your email and password instead of Google.");
    } else if (err) {
      // Format generic errors nicely
      setErrorMessage(
        err.split("_").map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ")
      );
    }
  }, [searchParams]);

  return (
    <main
      style={appShellVars}
      className="flex min-h-screen items-center justify-center px-6 py-12"
    >
      <Card className="w-full max-w-md" padding="xl">
        <div className="mb-8 flex flex-col gap-2">
          <Link
            href="/login"
            className="text-card-title text-ink no-underline tracking-[-0.3px] mb-2 inline-block"
          >
            <PolloyeLogo />
          </Link>
          <h1 className="text-headline m-0 text-ink">Login Failed</h1>
          <p className="text-body-sm m-0 text-ink-muted">
            We couldn't connect your account.
          </p>
        </div>

        <div className="mb-8 rounded-md bg-semantic-error/10 p-4 border border-semantic-error/20">
          <p className="text-body-sm m-0 text-semantic-error font-medium">
            {errorMessage}
          </p>
        </div>

        <Link href="/login" className="no-underline w-full block">
          <Button type="button" variant="primary" className="w-full">
            Return to Login
          </Button>
        </Link>
      </Card>
    </main>
  );
}
