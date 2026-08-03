"use client";

import {
  type CSSProperties,
  use,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function ShareQuizPage({
  params,
}: {
  params: Promise<{ quizSharingCode: string }>;
}) {
  const { quizSharingCode: raw } = use(params);
  const quizSharingCode = raw.toUpperCase();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [quiz, setQuiz] = useState<{
    name: string;
    description: string | null;
    quizSharingCode: string;
    _count: { questions: number };
  } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/share-quiz/${quizSharingCode}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        setQuiz(data.quiz);
      })
      .catch((err: Error) => setError(err.message));
  }, [quizSharingCode]);

  async function cloneQuiz() {
    if (!session) {
      router.push("/login");
      return;
    }
    setError("");
    const res = await fetch(`/api/share-quiz/${quizSharingCode}`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Clone failed");
      return;
    }
    setStatus(`Cloned as ${data.quiz.name}`);
    router.push("/create-quiz");
  }

  return (
    <main style={page}>
      <h1>Shared quiz</h1>
      {quiz ? (
        <section style={card}>
          <h2>{quiz.name}</h2>
          <p>{quiz.description || "No description"}</p>
          <p>
            Code <code>{quiz.quizSharingCode}</code> · {quiz._count.questions}{" "}
            questions
          </p>
          <button type="button" onClick={cloneQuiz}>
            Clone to my account
          </button>
        </section>
      ) : (
        <p>Loading…</p>
      )}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {status && <p style={{ color: "green" }}>{status}</p>}
      <p>
        <Link href="/create-quiz">Back to create quiz</Link>
      </p>
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 560,
  margin: "40px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  display: "grid",
  gap: 12,
};
