"use client";

import { Suspense } from "react";
import CreateQuizPage from "./create-quiz-client";

export default function CreateQuizRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-canvas p-8">
          <p className="text-body m-0 text-ink-muted">Loading…</p>
        </main>
      }
    >
      <CreateQuizPage />
    </Suspense>
  );
}
