"use client";

import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";

type QuestionType = "MCQ" | "MSQ" | "TRUE_FALSE";
type AnalyticsType = "BARCHART" | "PIE_CHART" | "DONUT_CHART";
type OptionNature = "CORRECT" | "WRONG";

type OptionDraft = {
  optionDescription: string;
  optImgLink: string;
  optionNature: OptionNature;
};

type QuestionDraft = {
  questionDescription: string;
  quesImgLink: string;
  questionType: QuestionType;
  analyticsType: AnalyticsType;
  score: number;
  durationMs: number;
  position: number;
};

type QuestionCard = {
  localId: string;
  serverId: string | null;
  question: QuestionDraft;
  options: OptionDraft[];
  dirty: boolean;
  saving: boolean;
  error: string | null;
};

type QuizSummary = {
  id: string;
  name: string;
  description: string | null;
  quizSharingCode: string;
};

const DEBOUNCE_MS = 800;

function newLocalId() {
  return crypto.randomUUID();
}

function defaultMcqOptions(): OptionDraft[] {
  return [
    {
      optionDescription: "Option A description",
      optImgLink: "",
      optionNature: "CORRECT",
    },
    {
      optionDescription: "Option B description",
      optImgLink: "",
      optionNature: "WRONG",
    },
  ];
}

function trueFalseOptions(): OptionDraft[] {
  return [
    { optionDescription: "True", optImgLink: "", optionNature: "CORRECT" },
    { optionDescription: "False", optImgLink: "", optionNature: "WRONG" },
  ];
}

function createBlankCard(position: number): QuestionCard {
  return {
    localId: newLocalId(),
    serverId: null,
    dirty: true,
    saving: false,
    error: null,
    question: {
      questionDescription: "Untitled question text",
      quesImgLink: "",
      questionType: "MCQ",
      analyticsType: "BARCHART",
      score: 1000,
      durationMs: 30_000,
      position,
    },
    options: defaultMcqOptions(),
  };
}

function buildPayload(card: QuestionCard) {
  return {
    question: {
      questionDescription: card.question.questionDescription,
      quesImgLink: card.question.quesImgLink.trim()
        ? card.question.quesImgLink
        : null,
      questionType: card.question.questionType,
      analyticsType: card.question.analyticsType,
      score: card.question.score,
      duration: card.question.durationMs,
      position: card.question.position,
    },
    options: card.options.map((option) => ({
      optionDescription: option.optionDescription,
      optImgLink: option.optImgLink.trim() ? option.optImgLink : null,
      optionNature: option.optionNature,
    })),
  };
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details
      ? ` ${JSON.stringify(data.details)}`
      : "";
    throw new Error(
      `${typeof data.error === "string" ? data.error : `Request failed (${res.status})`}${details}`,
    );
  }
  return data;
}

export default function CreateQuizTestPage() {
  const { data: session, isPending } = authClient.useSession();

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [quizName, setQuizName] = useState("My Test Quiz");
  const [quizDescription, setQuizDescription] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<QuizSummary | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [cards, setCards] = useState<QuestionCard[]>([]);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const loadQuizzes = useCallback(async () => {
    const data = await readJson(await fetch("/api/quiz"));
    setQuizzes(data.quizzes ?? []);
  }, []);

  const loadQuiz = useCallback(async (quizId: string) => {
    const data = await readJson(await fetch(`/api/quiz/${quizId}`));
    setActiveQuiz(data.quiz);
    setQuizName(data.quiz.name);
    setQuizDescription(data.quiz.description ?? "");
    setCards(
      (data.quiz.questions ?? []).map(
        (q: {
          id: string;
          questionDescription: string;
          quesImgLink: string | null;
          questionType: QuestionType;
          analyticsType: AnalyticsType;
          score: number;
          duration: number;
          position: number;
          options: Array<{
            optionDescription: string;
            optImgLink: string | null;
            optionNature: OptionNature;
          }>;
        }) =>
          ({
            localId: q.id,
            serverId: q.id,
            dirty: false,
            saving: false,
            error: null,
            question: {
              questionDescription: q.questionDescription,
              quesImgLink: q.quesImgLink ?? "",
              questionType: q.questionType,
              analyticsType: q.analyticsType,
              score: q.score,
              durationMs: q.duration,
              position: q.position,
            },
            options: q.options.map((option) => ({
              optionDescription: option.optionDescription,
              optImgLink: option.optImgLink ?? "",
              optionNature: option.optionNature,
            })),
          }) satisfies QuestionCard,
      ),
    );
  }, []);

  useEffect(() => {
    if (!session) return;
    loadQuizzes().catch((err: Error) => setError(err.message));
  }, [session, loadQuizzes]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const saveCard = useCallback(
    async (localId: string) => {
      if (!activeQuiz) return;
      const card = cardsRef.current.find((c) => c.localId === localId);
      if (!card || card.saving) return;

      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? { ...c, saving: true, error: null }
            : c,
        ),
      );

      const payload = buildPayload(card);

      try {
        if (card.serverId) {
          const data = await readJson(
            await fetch(
              `/api/quiz/${activeQuiz.id}/question/${card.serverId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            ),
          );
          setCards((prev) =>
            prev.map((c) =>
              c.localId === localId
                ? {
                    ...c,
                    serverId: data.question.id,
                    dirty: false,
                    saving: false,
                    error: null,
                    question: {
                      ...c.question,
                      position: data.question.position,
                    },
                  }
                : c,
            ),
          );
          setStatus(`Updated question #${card.question.position}`);
        } else {
          const data = await readJson(
            await fetch(`/api/quiz/${activeQuiz.id}/question`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }),
          );
          setCards((prev) =>
            prev.map((c) =>
              c.localId === localId
                ? {
                    ...c,
                    serverId: data.question.id,
                    localId: data.question.id,
                    dirty: false,
                    saving: false,
                    error: null,
                  }
                : c,
            ),
          );
          setStatus(`Saved question #${card.question.position}`);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save question";
        setCards((prev) =>
          prev.map((c) =>
            c.localId === localId
              ? { ...c, saving: false, error: message }
              : c,
          ),
        );
        setError(message);
      }
    },
    [activeQuiz],
  );

  function scheduleSave(localId: string) {
    const existing = saveTimers.current.get(localId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      saveTimers.current.delete(localId);
      void saveCard(localId);
    }, DEBOUNCE_MS);
    saveTimers.current.set(localId, timer);
  }

  function updateCard(
    localId: string,
    updater: (card: QuestionCard) => QuestionCard,
    autosave = true,
  ) {
    setCards((prev) =>
      prev.map((card) => {
        if (card.localId !== localId) return card;
        return { ...updater(card), dirty: true, error: null };
      }),
    );
    if (autosave) scheduleSave(localId);
  }

  function addQuestionCard() {
    const nextPosition =
      cards.length === 0
        ? 0
        : Math.max(...cards.map((c) => c.question.position)) + 1;

    // Finalize previous dirty card before opening a new one.
    const previous = cards[cards.length - 1];
    if (previous?.dirty && !previous.saving) {
      const existing = saveTimers.current.get(previous.localId);
      if (existing) {
        clearTimeout(existing);
        saveTimers.current.delete(previous.localId);
      }
      void saveCard(previous.localId);
    }

    setCards((prev) => [...prev, createBlankCard(nextPosition)]);
  }

  async function deleteCard(localId: string) {
    const card = cards.find((c) => c.localId === localId);
    if (!card || !activeQuiz) return;

    const timer = saveTimers.current.get(localId);
    if (timer) {
      clearTimeout(timer);
      saveTimers.current.delete(localId);
    }

    if (card.serverId) {
      try {
        await readJson(
          await fetch(
            `/api/quiz/${activeQuiz.id}/question/${card.serverId}`,
            { method: "DELETE" },
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        return;
      }
    }

    setCards((prev) => prev.filter((c) => c.localId !== localId));
    setStatus("Question removed");
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (authMode === "signup") {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name || email.split("@")[0],
      });
      if (signUpError) {
        setError(signUpError.message ?? "Sign up failed");
        return;
      }
      setStatus("Signed up");
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    setStatus("Signed in");
  }

  async function handleCreateQuiz(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await readJson(
        await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: quizName,
            description: quizDescription || undefined,
          }),
        }),
      );
      setActiveQuiz(data.quiz);
      setCards([createBlankCard(0)]);
      setStatus(`Created quiz ${data.quiz.id}`);
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
    }
  }

  async function handleUpdateQuiz(e: FormEvent) {
    e.preventDefault();
    if (!activeQuiz) return;
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/quiz/${activeQuiz.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: quizName,
            description: quizDescription || null,
          }),
        }),
      );
      setActiveQuiz(data.quiz);
      setStatus("Quiz updated");
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quiz");
    }
  }

  async function handleDeleteQuiz() {
    if (!activeQuiz) return;
    setError("");
    try {
      await readJson(
        await fetch(`/api/quiz/${activeQuiz.id}`, { method: "DELETE" }),
      );
      setActiveQuiz(null);
      setCards([]);
      setStatus("Quiz deleted");
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz");
    }
  }

  if (isPending) {
    return <main style={pageStyle}>Loading session…</main>;
  }

  if (!session) {
    return (
      <main style={pageStyle}>
        <h1>Create Quiz (test)</h1>
        <p>Sign in to create and edit quizzes.</p>
        <form onSubmit={handleAuth} style={cardStyle}>
          <label style={labelStyle}>
            Mode
            <select
              value={authMode}
              onChange={(e) =>
                setAuthMode(e.target.value as "signin" | "signup")
              }
            >
              <option value="signin">Sign in</option>
              <option value="signup">Sign up</option>
            </select>
          </label>
          {authMode === "signup" && (
            <label style={labelStyle}>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit">
            {authMode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {status && <p style={{ color: "green" }}>{status}</p>}
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header
        style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <h1>Create Quiz (test harness)</h1>
          <p>Signed in as {session.user.email}</p>
          <p style={{ color: "#555", fontSize: 14 }}>
            Edit cards locally. Each card saves as one{" "}
            <code>{"{ question, options }"}</code> POST/PATCH. “Add question”
            finalizes the previous card (debounced autosave on edits too).
          </p>
        </div>
        <button type="button" onClick={() => authClient.signOut()}>
          Sign out
        </button>
      </header>

      {error && (
        <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>
      )}
      {status && <p style={{ color: "green" }}>{status}</p>}

      <section style={cardStyle}>
        <h2>Your quizzes</h2>
        {quizzes.length === 0 ? (
          <p>No quizzes yet.</p>
        ) : (
          <ul>
            {quizzes.map((quiz) => (
              <li key={quiz.id} style={{ marginBottom: 8 }}>
                <button type="button" onClick={() => loadQuiz(quiz.id)}>
                  Load
                </button>{" "}
                {quiz.name} ({quiz.quizSharingCode})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={cardStyle}>
        <h2>{activeQuiz ? "Edit quiz" : "Create quiz"}</h2>
        <form
          onSubmit={activeQuiz ? handleUpdateQuiz : handleCreateQuiz}
          style={{ display: "grid", gap: 12 }}
        >
          <label style={labelStyle}>
            Name
            <input
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              required
            />
          </label>
          <label style={labelStyle}>
            Description
            <textarea
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              rows={2}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">
              {activeQuiz ? "Update quiz" : "Create quiz"}
            </button>
            {activeQuiz && (
              <button type="button" onClick={handleDeleteQuiz}>
                Delete quiz
              </button>
            )}
          </div>
        </form>
        {activeQuiz && (
          <p>
            Active: <code>{activeQuiz.id}</code> · code{" "}
            <code>{activeQuiz.quizSharingCode}</code>
          </p>
        )}
      </section>

      {activeQuiz && (
        <section style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>Questions ({cards.length})</h2>
            <button type="button" onClick={addQuestionCard}>
              Add question
            </button>
          </div>

          {cards.length === 0 && (
            <p>
              No question cards yet. Click <strong>Add question</strong>.
            </p>
          )}

          {cards.map((card, index) => (
            <article key={card.localId} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <strong>
                  Card {index + 1} · position {card.question.position} ·{" "}
                  {card.serverId ? "saved" : "new"}
                  {card.dirty ? " · dirty" : ""}
                  {card.saving ? " · saving…" : ""}
                </strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    disabled={card.saving}
                    onClick={() => saveCard(card.localId)}
                  >
                    {card.serverId ? "Save (PATCH)" : "Save (POST)"}
                  </button>
                  <button
                    type="button"
                    disabled={card.saving}
                    onClick={() => deleteCard(card.localId)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {card.error && (
                <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
                  {card.error}
                </p>
              )}

              <label style={labelStyle}>
                Question description
                <textarea
                  value={card.question.questionDescription}
                  rows={2}
                  onChange={(e) =>
                    updateCard(card.localId, (c) => ({
                      ...c,
                      question: {
                        ...c.question,
                        questionDescription: e.target.value,
                      },
                    }))
                  }
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <label style={labelStyle}>
                  Type
                  <select
                    value={card.question.questionType}
                    onChange={(e) => {
                      const questionType = e.target.value as QuestionType;
                      updateCard(card.localId, (c) => ({
                        ...c,
                        question: { ...c.question, questionType },
                        options:
                          questionType === "TRUE_FALSE"
                            ? trueFalseOptions()
                            : c.question.questionType === "TRUE_FALSE"
                              ? defaultMcqOptions()
                              : c.options,
                      }));
                    }}
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="MSQ">MSQ</option>
                    <option value="TRUE_FALSE">TRUE_FALSE</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Analytics
                  <select
                    value={card.question.analyticsType}
                    onChange={(e) =>
                      updateCard(card.localId, (c) => ({
                        ...c,
                        question: {
                          ...c.question,
                          analyticsType: e.target.value as AnalyticsType,
                        },
                      }))
                    }
                  >
                    <option value="BARCHART">BARCHART</option>
                    <option value="PIE_CHART">PIE_CHART</option>
                    <option value="DONUT_CHART">DONUT_CHART</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Score
                  <select
                    value={card.question.score}
                    onChange={(e) =>
                      updateCard(card.localId, (c) => ({
                        ...c,
                        question: {
                          ...c.question,
                          score: Number(e.target.value),
                        },
                      }))
                    }
                  >
                    {[1000, 2000, 3000, 4000, 5000].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Duration (seconds)
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={card.question.durationMs / 1000}
                    onChange={(e) =>
                      updateCard(card.localId, (c) => ({
                        ...c,
                        question: {
                          ...c.question,
                          durationMs: Number(e.target.value) * 1000,
                        },
                      }))
                    }
                  />
                </label>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Options</h3>
                  {card.question.questionType !== "TRUE_FALSE" &&
                    card.options.length < 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateCard(card.localId, (c) => ({
                            ...c,
                            options: [
                              ...c.options,
                              {
                                optionDescription: "New option text",
                                optImgLink: "",
                                optionNature: "WRONG",
                              },
                            ],
                          }))
                        }
                      >
                        Add option
                      </button>
                    )}
                </div>

                {card.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    style={{
                      border: "1px solid #ccc",
                      padding: 12,
                      marginBottom: 8,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <label style={labelStyle}>
                      Description
                      <input
                        value={option.optionDescription}
                        disabled={card.question.questionType === "TRUE_FALSE"}
                        onChange={(e) =>
                          updateCard(card.localId, (c) => ({
                            ...c,
                            options: c.options.map((opt, i) =>
                              i === optionIndex
                                ? {
                                    ...opt,
                                    optionDescription: e.target.value,
                                  }
                                : opt,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label style={labelStyle}>
                      Nature
                      <select
                        value={option.optionNature}
                        onChange={(e) =>
                          updateCard(card.localId, (c) => ({
                            ...c,
                            options: c.options.map((opt, i) =>
                              i === optionIndex
                                ? {
                                    ...opt,
                                    optionNature: e.target
                                      .value as OptionNature,
                                  }
                                : opt,
                            ),
                          }))
                        }
                      >
                        <option value="CORRECT">CORRECT</option>
                        <option value="WRONG">WRONG</option>
                      </select>
                    </label>
                    {card.question.questionType !== "TRUE_FALSE" &&
                      card.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateCard(card.localId, (c) => ({
                              ...c,
                              options: c.options.filter(
                                (_, i) => i !== optionIndex,
                              ),
                            }))
                          }
                        >
                          Remove option
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </article>
          ))}

          {cards.length > 0 && (
            <button type="button" onClick={addQuestionCard}>
              Add question
            </button>
          )}
        </section>
      )}
    </main>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 24,
  display: "grid",
  gap: 20,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  display: "grid",
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};
