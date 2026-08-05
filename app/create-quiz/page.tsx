"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Input,
} from "@/components/ui";

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

const fieldClass =
  "w-full min-h-11 rounded-md border border-hairline bg-surface-1 px-3.5 py-2.5 text-body text-ink outline-none transition-colors focus:border-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-2";

const labelClass = "flex flex-col gap-1.5 text-body-sm font-medium text-ink";

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
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

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
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    loadQuizzes().catch((err: Error) => setError(err.message));
  }, [isPending, session, router, loadQuizzes]);

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

  async function handleStartLiveSession() {
    if (!activeQuiz) return;
    setError("");
    try {
      // Ensure dirty cards are saved first
      const dirty = cards.filter((c) => c.dirty && !c.saving);
      for (const card of dirty) {
        await saveCard(card.localId);
      }

      const data = await readJson(
        await fetch(`/api/quiz/${activeQuiz.id}/session`, { method: "POST" }),
      );
      setStatus(`Live session ${data.session.sessionCode}`);
      router.push(`/join-quiz/${data.session.sessionCode}/host`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start live session",
      );
    }
  }

  if (isPending || !session) {
    return (
      <main style={appShellVars} className="flex items-center justify-center p-8">
        <p className="text-body text-ink-muted m-0">
          {isPending ? "Loading…" : "Redirecting to login…"}
        </p>
      </main>
    );
  }

  return (
    <div style={appShellVars}>
      <AppNav />
      <main className="mx-auto grid max-w-[900px] gap-6 px-6 pb-24 pt-12">
        <header className="grid gap-2">
          <Eyebrow>Authoring</Eyebrow>
          <h1 className="text-display-md m-0 text-ink">Create quiz</h1>
          <p className="text-body m-0 max-w-xl text-ink-muted">
            Edit question cards locally. Changes autosave after a short pause.
            Adding a question finalizes the previous card first.
          </p>
        </header>

        {error && (
          <p
            className="text-body-sm m-0 whitespace-pre-wrap text-semantic-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {status && <p className="text-body-sm m-0 text-sage">{status}</p>}

        <Card className="grid gap-4">
          <h2 className="text-card-title m-0">Your quizzes</h2>
          {quizzes.length === 0 ? (
            <p className="text-body-sm m-0 text-ink-muted">No quizzes yet.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0">
              {quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-hairline px-3 py-2"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadQuiz(quiz.id)}
                  >
                    Load
                  </Button>
                  <span className="text-body-sm min-w-0 flex-1 font-medium">
                    {quiz.name}
                  </span>
                  <code className="text-mono text-ink-muted">
                    {quiz.quizSharingCode}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-card-title m-0">
            {activeQuiz ? "Edit quiz" : "Create quiz"}
          </h2>
          <form
            onSubmit={activeQuiz ? handleUpdateQuiz : handleCreateQuiz}
            className="grid gap-4"
          >
            <Input
              label="Name"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              required
            />
            <label className={labelClass}>
              Description
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                rows={2}
                className={fieldClass}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant={activeQuiz ? "primary" : "accent"}>
                {activeQuiz ? "Update quiz" : "Create quiz"}
              </Button>
              {activeQuiz && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleDeleteQuiz()}
                >
                  Delete quiz
                </Button>
              )}
              {activeQuiz && (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => void handleStartLiveSession()}
                >
                  Begin
                </Button>
              )}
            </div>
          </form>
          {activeQuiz && (
            <p className="text-caption m-0 text-ink-muted">
              Share code{" "}
              <code className="text-mono">{activeQuiz.quizSharingCode}</code>
              {" · "}
              <Link
                href={`/share-quiz/${activeQuiz.quizSharingCode}`}
                className="font-medium text-ink"
              >
                Share template
              </Link>
            </p>
          )}
        </Card>

        {activeQuiz && (
          <section className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-headline m-0">
                Questions ({cards.length})
              </h2>
              <Button type="button" variant="secondary" onClick={addQuestionCard}>
                Add question
              </Button>
            </div>

            {cards.length === 0 && (
              <EmptyState
                title="No questions yet"
                description="Add a question card to start building this quiz."
                action={
                  <Button type="button" variant="accent" onClick={addQuestionCard}>
                    Add question
                  </Button>
                }
              />
            )}

            {cards.map((card, index) => (
              <Card key={card.localId} className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-subhead font-medium">
                      Card {index + 1}
                    </strong>
                    <Badge tone="neutral">pos {card.question.position}</Badge>
                    <Badge tone={card.serverId ? "sage" : "phase"}>
                      {card.serverId ? "saved" : "new"}
                    </Badge>
                    {card.dirty && <Badge tone="phase">unsaved</Badge>}
                    {card.saving && <Badge tone="phase">saving…</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={card.saving}
                      onClick={() => void saveCard(card.localId)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      disabled={card.saving}
                      onClick={() => void deleteCard(card.localId)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {card.error && (
                  <p className="text-body-sm m-0 whitespace-pre-wrap text-semantic-error">
                    {card.error}
                  </p>
                )}

                <label className={labelClass}>
                  Question description
                  <textarea
                    value={card.question.questionDescription}
                    rows={2}
                    className={fieldClass}
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className={labelClass}>
                    Type
                    <select
                      value={card.question.questionType}
                      className={fieldClass}
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

                  <label className={labelClass}>
                    Analytics
                    <select
                      value={card.question.analyticsType}
                      className={fieldClass}
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

                  <label className={labelClass}>
                    Score
                    <select
                      value={card.question.score}
                      className={fieldClass}
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

                  <label className={labelClass}>
                    Duration (seconds)
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={card.question.durationMs / 1000}
                      className={fieldClass}
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

                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-body m-0 font-medium">Options</h3>
                    {card.question.questionType !== "TRUE_FALSE" &&
                      card.options.length < 4 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
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
                        </Button>
                      )}
                  </div>

                  {card.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="grid gap-3 rounded-md border border-hairline bg-canvas p-4"
                    >
                      <Input
                        label="Description"
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
                      <label className={labelClass}>
                        Nature
                        <select
                          value={option.optionNature}
                          className={fieldClass}
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
                          <Button
                            type="button"
                            variant="tertiary"
                            size="sm"
                            className="w-fit"
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
                          </Button>
                        )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {cards.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={addQuestionCard}
                className="w-fit"
              >
                Add question
              </Button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
