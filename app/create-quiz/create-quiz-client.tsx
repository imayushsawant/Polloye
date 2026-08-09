"use client";

import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppNav, appShellVars } from "@/components/app-nav";
import { Button, Card, Eyebrow, Input, cx } from "@/components/ui";
import {
  DURATION_OPTIONS,
  DURATION_VALUES_MS,
  SCORE_OPTIONS,
  type DurationMs,
} from "@/lib/validations/question";

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
  imageUploading: boolean;
  /** Index of option currently uploading an image, if any. */
  optionImageUploading: number | null;
  error: string | null;
  collapsed: boolean;
  advancedOpen: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function IconChevron({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={cx(
        "transition-transform",
        open ? "rotate-0" : "-rotate-90",
        className,
      )}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconGrip({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function IconImage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function coerceDurationMs(ms: number): DurationMs {
  if ((DURATION_VALUES_MS as readonly number[]).includes(ms)) {
    return ms as DurationMs;
  }
  return 30_000;
}

function newLocalId() {
  return crypto.randomUUID();
}

function defaultMcqOptions(): OptionDraft[] {
  return [
    { optionDescription: "", optImgLink: "", optionNature: "CORRECT" },
    { optionDescription: "", optImgLink: "", optionNature: "WRONG" },
    { optionDescription: "", optImgLink: "", optionNature: "WRONG" },
    { optionDescription: "", optImgLink: "", optionNature: "WRONG" },
  ];
}

/** MCQ / True-False: exactly one correct — selecting Correct clears the others. */
function withExclusiveCorrect(
  options: OptionDraft[],
  correctIndex: number,
): OptionDraft[] {
  return options.map((opt, i) => ({
    ...opt,
    optionNature: i === correctIndex ? "CORRECT" : "WRONG",
  }));
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
    imageUploading: false,
    optionImageUploading: null,
    error: null,
    collapsed: false,
    advancedOpen: false,
    question: {
      questionDescription: "",
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

/** Skip network save until the card would pass server validation. */
function canPersist(card: QuestionCard): boolean {
  const q = card.question.questionDescription.trim();
  if (q.length < 10 && !card.question.quesImgLink.trim()) return false;

  if (card.question.questionType !== "TRUE_FALSE") {
    for (const opt of card.options) {
      if (opt.optionDescription.trim().length < 10 && !opt.optImgLink.trim()) {
        return false;
      }
    }
  }

  const correct = card.options.filter((o) => o.optionNature === "CORRECT")
    .length;
  if (
    (card.question.questionType === "MCQ" ||
      card.question.questionType === "TRUE_FALSE") &&
    correct !== 1
  ) {
    return false;
  }
  if (card.question.questionType === "MSQ" && correct < 1) return false;

  return true;
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details ? ` ${JSON.stringify(data.details)}` : "";
    throw new Error(
      `${typeof data.error === "string" ? data.error : `Request failed (${res.status})`}${details}`,
    );
  }
  return data;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editQuizId = searchParams.get("quizId");
  const { data: session, isPending } = authClient.useSession();

  const [error, setError] = useState("");
  const [savingAll, setSavingAll] = useState(false);

  const [quizName, setQuizName] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<QuizSummary | null>(null);
  const [cards, setCards] = useState<QuestionCard[]>([]);
  const [metaDirty, setMetaDirty] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const activeQuizRef = useRef(activeQuiz);
  activeQuizRef.current = activeQuiz;
  const quizMetaRef = useRef({ name: quizName, description: quizDescription });
  quizMetaRef.current = { name: quizName, description: quizDescription };

  const loadQuiz = useCallback(async (quizId: string) => {
    const data = await readJson(await fetch(`/api/quiz/${quizId}`));
    setActiveQuiz(data.quiz);
    setQuizName(data.quiz.name);
    setQuizDescription(data.quiz.description ?? "");
    setMetaDirty(false);
    const loaded = (data.quiz.questions ?? []).map(
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
          imageUploading: false,
          optionImageUploading: null,
          error: null,
          collapsed: false,
          advancedOpen: false,
          question: {
            questionDescription: q.questionDescription,
            quesImgLink: q.quesImgLink ?? "",
            questionType: q.questionType,
            analyticsType: q.analyticsType,
            score: q.score,
            durationMs: coerceDurationMs(q.duration),
            position: q.position,
          },
          options: q.options.map((option) => ({
            optionDescription: option.optionDescription,
            optImgLink: option.optImgLink ?? "",
            optionNature: option.optionNature,
          })),
        }) satisfies QuestionCard,
    );
    setCards(loaded.length > 0 ? loaded : [createBlankCard(0)]);
  }, []);

  // Only reload from the server when quizId changes — not on every auth
  // session object refresh, which was wiping in-progress question drafts.
  const loadedQuizIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!editQuizId) {
      loadedQuizIdRef.current = null;
      return;
    }
    if (loadedQuizIdRef.current === editQuizId) return;
    loadedQuizIdRef.current = editQuizId;
    loadQuiz(editQuizId).catch((err: Error) => {
      loadedQuizIdRef.current = null;
      setError(err.message);
    });
  }, [isPending, session, router, editQuizId, loadQuiz]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) clearTimeout(timer);
      if (metaTimer.current) clearTimeout(metaTimer.current);
    };
  }, []);

  const saveQuizMeta = useCallback(async () => {
    const quiz = activeQuizRef.current;
    if (!quiz) return;
    const { name, description } = quizMetaRef.current;
    if (!name.trim()) return;
    try {
      const data = await readJson(
        await fetch(`/api/quiz/${quiz.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        }),
      );
      setActiveQuiz(data.quiz);
      setMetaDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quiz");
    }
  }, []);

  function scheduleMetaSave() {
    setMetaDirty(true);
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => {
      metaTimer.current = null;
      void saveQuizMeta();
    }, DEBOUNCE_MS);
  }

  const saveCard = useCallback(async (localId: string, force = false) => {
    const quiz = activeQuizRef.current;
    if (!quiz) return false;
    const card = cardsRef.current.find((c) => c.localId === localId);
    if (!card || card.saving) return false;
    if (!force && !canPersist(card)) return false;

    setCards((prev) =>
      prev.map((c) =>
        c.localId === localId ? { ...c, saving: true, error: null } : c,
      ),
    );

    const payload = buildPayload(card);

    try {
      if (card.serverId) {
        const data = await readJson(
          await fetch(`/api/quiz/${quiz.id}/question/${card.serverId}`, {
            method: "PATCH",
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
      } else {
        const data = await readJson(
          await fetch(`/api/quiz/${quiz.id}/question`, {
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
                  dirty: false,
                  saving: false,
                  error: null,
                }
              : c,
          ),
        );
      }
      return true;
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
      if (force) setError(message);
      return false;
    }
  }, []);

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

  async function uploadQuestionImage(localId: string, file: File) {
    const quiz = activeQuizRef.current;
    if (!quiz) {
      setError("Save the quiz name first so images can be uploaded.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                error: "Use a JPEG, PNG, WebP, or GIF image.",
              }
            : c,
        ),
      );
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                error: "Image must be 5 MB or smaller.",
              }
            : c,
        ),
      );
      return;
    }

    setCards((prev) =>
      prev.map((c) =>
        c.localId === localId
          ? { ...c, imageUploading: true, error: null }
          : c,
      ),
    );

    try {
      const form = new FormData();
      form.append("quizId", quiz.id);
      form.append("kind", "question");
      form.append("file", file);

      const data = await readJson(
        await fetch("/api/upload", {
          method: "POST",
          body: form,
        }),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                imageUploading: false,
                dirty: true,
                error: null,
                question: {
                  ...c.question,
                  quesImgLink: data.publicUrl as string,
                },
              }
            : c,
        ),
      );
      scheduleSave(localId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload image";
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? { ...c, imageUploading: false, error: message }
            : c,
        ),
      );
    }
  }

  function removeQuestionImage(localId: string) {
    updateCard(localId, (c) => ({
      ...c,
      question: { ...c.question, quesImgLink: "" },
    }));
  }

  async function uploadOptionImage(
    localId: string,
    optionIndex: number,
    file: File,
  ) {
    const quiz = activeQuizRef.current;
    if (!quiz) {
      setError("Save the quiz name first so images can be uploaded.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                error: "Use a JPEG, PNG, WebP, or GIF image.",
              }
            : c,
        ),
      );
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                error: "Image must be 5 MB or smaller.",
              }
            : c,
        ),
      );
      return;
    }

    setCards((prev) =>
      prev.map((c) =>
        c.localId === localId
          ? { ...c, optionImageUploading: optionIndex, error: null }
          : c,
      ),
    );

    try {
      const form = new FormData();
      form.append("quizId", quiz.id);
      form.append("kind", "option");
      form.append("file", file);

      const data = await readJson(
        await fetch("/api/upload", {
          method: "POST",
          body: form,
        }),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? {
                ...c,
                optionImageUploading: null,
                dirty: true,
                error: null,
                options: c.options.map((opt, i) =>
                  i === optionIndex
                    ? { ...opt, optImgLink: data.publicUrl as string }
                    : opt,
                ),
              }
            : c,
        ),
      );
      scheduleSave(localId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload image";
      setCards((prev) =>
        prev.map((c) =>
          c.localId === localId
            ? { ...c, optionImageUploading: null, error: message }
            : c,
        ),
      );
    }
  }

  function removeOptionImage(localId: string, optionIndex: number) {
    updateCard(localId, (c) => ({
      ...c,
      options: c.options.map((opt, i) =>
        i === optionIndex ? { ...opt, optImgLink: "" } : opt,
      ),
    }));
  }

  function addQuestionCard() {
    const nextPosition =
      cards.length === 0
        ? 0
        : Math.max(...cards.map((c) => c.question.position)) + 1;

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
  }

  async function persistOrder(nextCards: QuestionCard[]) {
    const quiz = activeQuizRef.current;
    if (!quiz) return;

    const withServer = nextCards.filter((c) => c.serverId);
    if (withServer.length === 0) return;

    try {
      for (let i = 0; i < withServer.length; i++) {
        const card = withServer[i];
        await readJson(
          await fetch(`/api/quiz/${quiz.id}/question/${card.serverId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...buildPayload({
                ...card,
                question: {
                  ...card.question,
                  position: 10_000 + i,
                },
              }),
            }),
          }),
        );
      }
      for (let i = 0; i < withServer.length; i++) {
        const card = withServer[i];
        await readJson(
          await fetch(`/api/quiz/${quiz.id}/question/${card.serverId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...buildPayload({
                ...card,
                question: { ...card.question, position: i },
              }),
            }),
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  function reorderCards(fromId: string, toId: string) {
    if (fromId === toId) return;
    setCards((prev) => {
      const fromIndex = prev.findIndex((c) => c.localId === fromId);
      const toIndex = prev.findIndex((c) => c.localId === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const renumbered = next.map((card, index) => ({
        ...card,
        dirty: true,
        question: { ...card.question, position: index },
      }));
      queueMicrotask(() => void persistOrder(renumbered));
      return renumbered;
    });
  }

  async function handleCreateQuiz(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!quizName.trim()) {
      setError("Give your quiz a name");
      return;
    }
    try {
      const data = await readJson(
        await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: quizName.trim(),
            description: quizDescription.trim() || undefined,
          }),
        }),
      );
      setActiveQuiz(data.quiz);
      setCards([createBlankCard(0)]);
      loadedQuizIdRef.current = data.quiz.id;
      router.replace(`/create-quiz?quizId=${data.quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
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
      setQuizName("");
      setQuizDescription("");
      router.replace("/create-quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz");
    }
  }

  async function handleSaveAndExit() {
    if (!activeQuiz) return;
    setError("");
    setSavingAll(true);
    try {
      if (metaTimer.current) {
        clearTimeout(metaTimer.current);
        metaTimer.current = null;
      }
      if (metaDirty || quizName.trim() !== activeQuiz.name) {
        await saveQuizMeta();
      }

      for (const timer of saveTimers.current.values()) clearTimeout(timer);
      saveTimers.current.clear();

      const snapshot = cardsRef.current;
      for (const card of snapshot) {
        if (card.dirty || !card.serverId) {
          if (!canPersist(card)) {
            setError(
              "Finish every question and option (at least 10 characters) before saving.",
            );
            setSavingAll(false);
            return;
          }
          const ok = await saveCard(card.localId, true);
          if (!ok) {
            setSavingAll(false);
            return;
          }
        }
      }

      router.push(`/quizzes?open=${activeQuiz.id}`);
    } finally {
      setSavingAll(false);
    }
  }

  function onDragStart(localId: string) {
    setDragId(localId);
  }

  function onDragOver(e: DragEvent, localId: string) {
    e.preventDefault();
    if (!dragId || dragId === localId) return;
  }

  function onDrop(e: DragEvent, localId: string) {
    e.preventDefault();
    if (dragId) reorderCards(dragId, localId);
    setDragId(null);
  }

  if (isPending || !session) {
    return (
      <main
        style={appShellVars}
        className="flex items-center justify-center p-8"
      >
        <p className="text-body m-0 text-ink-muted">
          {isPending ? "Loading…" : "Redirecting to login…"}
        </p>
      </main>
    );
  }

  if (!activeQuiz) {
    return (
      <div style={appShellVars}>
        <AppNav />
        <main className="mx-auto grid max-w-[560px] gap-6 px-6 pb-24 pt-12">
          <header className="grid gap-2">
            <Eyebrow>Authoring</Eyebrow>
            <h1 className="text-display-md m-0 text-ink">Create quiz</h1>
            <p className="text-body m-0 text-ink-muted">
              Name your quiz, then add questions.
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

          <Card className="grid gap-4">
            <form onSubmit={handleCreateQuiz} className="grid gap-4">
              <Input
                label="Quiz name"
                value={quizName}
                onChange={(e) => setQuizName(e.target.value)}
                placeholder="e.g. Friday trivia"
                required
              />
              <label className={labelClass}>
                Description
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional short description"
                  className={fieldClass}
                />
              </label>
              <Button
                type="submit"
                variant="accent"
                className="w-full sm:w-fit"
              >
                Create quiz
              </Button>
            </form>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div style={appShellVars}>
      <AppNav />
      <main className="mx-auto grid max-w-[900px] gap-6 px-6 pb-24 pt-12">
        <Card className="relative grid gap-4 pr-14">
          <button
            type="button"
            className="absolute top-4 right-4 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-semantic-error"
            aria-label="Delete quiz"
            title="Delete quiz"
            onClick={() => void handleDeleteQuiz()}
          >
            <IconTrash />
          </button>

          <header className="grid gap-1">
            <Eyebrow>Editing</Eyebrow>
            <h1 className="text-headline m-0 text-ink">Quiz details</h1>
          </header>

          <Input
            label="Quiz name"
            value={quizName}
            onChange={(e) => {
              setQuizName(e.target.value);
              scheduleMetaSave();
            }}
            required
          />
          <label className={labelClass}>
            Description
            <textarea
              value={quizDescription}
              onChange={(e) => {
                setQuizDescription(e.target.value);
                scheduleMetaSave();
              }}
              rows={2}
              placeholder="Optional short description"
              className={fieldClass}
            />
          </label>
        </Card>

        {error && (
          <p
            className="text-body-sm m-0 whitespace-pre-wrap text-semantic-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-headline m-0">Questions</h2>
            <Button type="button" variant="secondary" onClick={addQuestionCard}>
              Add question
            </Button>
          </div>

          {cards.map((card, index) => {
            const preview =
              card.question.questionDescription.trim() || "Untitled question";
            return (
              <Card
                key={card.localId}
                padding="none"
                className={cx(
                  "overflow-hidden",
                  dragId === card.localId && "opacity-60",
                )}
                onDragOver={(e) => onDragOver(e, card.localId)}
                onDrop={(e) => onDrop(e, card.localId)}
              >
                <div className="flex items-center gap-1 border-b border-hairline-soft px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 min-w-8 cursor-grab items-center justify-center text-ink-tertiary active:cursor-grabbing"
                    draggable
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    onDragStart={() => onDragStart(card.localId)}
                    onDragEnd={() => setDragId(null)}
                  >
                    <IconGrip />
                  </button>
                  <button
                    type="button"
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left hover:bg-surface-2"
                    aria-expanded={!card.collapsed}
                    onClick={() =>
                      setCards((prev) =>
                        prev.map((c) =>
                          c.localId === card.localId
                            ? { ...c, collapsed: !c.collapsed }
                            : c,
                        ),
                      )
                    }
                  >
                    <IconChevron
                      open={!card.collapsed}
                      className="shrink-0 text-ink-muted"
                    />
                    <span className="text-body-sm shrink-0 font-medium text-ink">
                      {index + 1}.
                    </span>
                    <span className="text-body-sm min-w-0 truncate text-ink-muted">
                      {preview}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-semantic-error"
                    aria-label="Delete question"
                    title="Delete question"
                    onClick={() => void deleteCard(card.localId)}
                  >
                    <IconTrash />
                  </button>
                </div>

                {!card.collapsed && (
                  <div className="grid gap-4 p-4 md:p-6">
                    {card.error && (
                      <p className="text-body-sm m-0 whitespace-pre-wrap text-semantic-error">
                        {card.error}
                      </p>
                    )}

                    <label className={labelClass}>
                      Question
                      <textarea
                        value={card.question.questionDescription}
                        rows={2}
                        placeholder="Type your question…"
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

                    <div className="flex flex-col gap-2">
                      {card.question.quesImgLink ? (
                        <div className="relative max-w-md overflow-hidden rounded-md border border-hairline bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.question.quesImgLink}
                            alt="Question"
                            className="max-h-48 w-full object-contain"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-hairline bg-surface-1 text-ink-muted hover:text-semantic-error"
                            aria-label="Remove question image"
                            title="Remove image"
                            disabled={card.imageUploading}
                            onClick={() => removeQuestionImage(card.localId)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={cx(
                            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-hairline bg-surface-1 px-3.5 text-body-sm font-medium text-ink transition-colors hover:border-ink",
                            (!activeQuiz || card.imageUploading) &&
                              "pointer-events-none opacity-50",
                          )}
                        >
                          <IconImage />
                          {card.imageUploading
                            ? "Uploading…"
                            : card.question.quesImgLink
                              ? "Replace image"
                              : "Add image"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            disabled={!activeQuiz || card.imageUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) {
                                void uploadQuestionImage(card.localId, file);
                              }
                            }}
                          />
                        </label>
                        {!activeQuiz && (
                          <p className="text-caption m-0 text-ink-subtle">
                            Save the quiz name first to enable image uploads.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      <label className={cx(labelClass, "min-w-[140px] flex-1")}>
                        Type
                        <select
                          value={card.question.questionType}
                          className={fieldClass}
                          onChange={(e) => {
                            const questionType = e.target
                              .value as QuestionType;
                            updateCard(card.localId, (c) => {
                              let options = c.options;
                              if (questionType === "TRUE_FALSE") {
                                options = trueFalseOptions();
                              } else if (
                                c.question.questionType === "TRUE_FALSE"
                              ) {
                                options = defaultMcqOptions();
                              } else if (questionType === "MCQ") {
                                const firstCorrect = options.findIndex(
                                  (o) => o.optionNature === "CORRECT",
                                );
                                options = withExclusiveCorrect(
                                  options,
                                  firstCorrect >= 0 ? firstCorrect : 0,
                                );
                              }
                              return {
                                ...c,
                                question: { ...c.question, questionType },
                                options,
                              };
                            });
                          }}
                        >
                          <option value="MCQ">Single correct</option>
                          <option value="MSQ">Multiple correct</option>
                          <option value="TRUE_FALSE">True / False</option>
                        </select>
                      </label>

                      <label className={cx(labelClass, "min-w-[140px] flex-1")}>
                        Duration
                        <select
                          value={card.question.durationMs}
                          className={fieldClass}
                          onChange={(e) =>
                            updateCard(card.localId, (c) => ({
                              ...c,
                              question: {
                                ...c.question,
                                durationMs: Number(e.target.value) as DurationMs,
                              },
                            }))
                          }
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        className={cx(
                          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-hairline",
                          card.advancedOpen
                            ? "bg-ink text-on-primary"
                            : "bg-surface-1 text-ink-muted hover:text-ink",
                        )}
                        aria-label="Advanced settings"
                        aria-pressed={card.advancedOpen}
                        title="Advanced settings"
                        onClick={() =>
                          setCards((prev) =>
                            prev.map((c) =>
                              c.localId === card.localId
                                ? { ...c, advancedOpen: !c.advancedOpen }
                                : c,
                            ),
                          )
                        }
                      >
                        <IconSettings />
                      </button>
                    </div>

                    {card.advancedOpen && (
                      <div className="grid gap-3 rounded-md border border-hairline bg-canvas p-4 sm:grid-cols-2">
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
                                  analyticsType: e.target
                                    .value as AnalyticsType,
                                },
                              }))
                            }
                          >
                            <option value="BARCHART">Bar chart</option>
                            <option value="PIE_CHART">Pie chart</option>
                            <option value="DONUT_CHART">Donut chart</option>
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
                            {SCORE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

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
                                      optionDescription: "",
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

                      {card.options.map((option, optionIndex) => {
                        const optionUploading =
                          card.optionImageUploading === optionIndex;
                        return (
                        <div
                          key={optionIndex}
                          className={cx(
                            "flex flex-col gap-2 rounded-md border border-hairline p-3",
                            option.optionNature === "CORRECT"
                              ? "bg-[color-mix(in_srgb,var(--sage)_22%,white)]"
                              : "bg-[color-mix(in_srgb,var(--semantic-error)_12%,white)]",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={option.optionNature}
                            aria-label={`Option ${optionIndex + 1} nature`}
                            className="min-h-10 rounded-md border border-hairline bg-surface-1 px-2 text-body-sm text-ink outline-none focus:border-ink"
                            onChange={(e) => {
                              const nextNature = e.target
                                .value as OptionNature;
                              updateCard(card.localId, (c) => {
                                // True/False: always exactly one correct + one wrong.
                                if (c.question.questionType === "TRUE_FALSE") {
                                  const correctIndex =
                                    nextNature === "CORRECT"
                                      ? optionIndex
                                      : optionIndex === 0
                                        ? 1
                                        : 0;
                                  return {
                                    ...c,
                                    options: withExclusiveCorrect(
                                      c.options,
                                      correctIndex,
                                    ),
                                  };
                                }
                                if (
                                  nextNature === "CORRECT" &&
                                  c.question.questionType === "MCQ"
                                ) {
                                  return {
                                    ...c,
                                    options: withExclusiveCorrect(
                                      c.options,
                                      optionIndex,
                                    ),
                                  };
                                }
                                return {
                                  ...c,
                                  options: c.options.map((opt, i) =>
                                    i === optionIndex
                                      ? { ...opt, optionNature: nextNature }
                                      : opt,
                                  ),
                                };
                              });
                            }}
                          >
                            <option value="CORRECT">Correct</option>
                            <option value="WRONG">Wrong</option>
                          </select>
                          <input
                            value={option.optionDescription}
                            disabled={
                              card.question.questionType === "TRUE_FALSE"
                            }
                            placeholder={`Option ${optionIndex + 1}`}
                            aria-label={`Option ${optionIndex + 1}`}
                            className={cx(
                              fieldClass,
                              "min-w-[160px] flex-1 bg-surface-1/80",
                            )}
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
                          <label
                            className={cx(
                              "inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border border-hairline bg-surface-1 text-ink-muted transition-colors hover:text-ink",
                              (!activeQuiz || optionUploading) &&
                                "pointer-events-none opacity-50",
                            )}
                            title={
                              option.optImgLink
                                ? "Replace option image"
                                : "Add option image"
                            }
                            aria-label={
                              optionUploading
                                ? `Uploading image for option ${optionIndex + 1}`
                                : option.optImgLink
                                  ? `Replace image for option ${optionIndex + 1}`
                                  : `Add image for option ${optionIndex + 1}`
                            }
                          >
                            <IconImage />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="sr-only"
                              disabled={!activeQuiz || optionUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) {
                                  void uploadOptionImage(
                                    card.localId,
                                    optionIndex,
                                    file,
                                  );
                                }
                              }}
                            />
                          </label>
                          {card.question.questionType !== "TRUE_FALSE" &&
                            card.options.length > 2 && (
                              <button
                                type="button"
                                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1 hover:text-semantic-error"
                                aria-label={`Remove option ${optionIndex + 1}`}
                                title="Remove option"
                                onClick={() =>
                                  updateCard(card.localId, (c) => ({
                                    ...c,
                                    options: c.options.filter(
                                      (_, i) => i !== optionIndex,
                                    ),
                                  }))
                                }
                              >
                                <IconTrash />
                              </button>
                            )}
                          </div>

                          {optionUploading && (
                            <p className="text-caption m-0 text-ink-subtle">
                              Uploading image…
                            </p>
                          )}

                          {option.optImgLink ? (
                            <div className="relative max-w-xs overflow-hidden rounded-md border border-hairline bg-surface-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={option.optImgLink}
                                alt=""
                                className="max-h-32 w-full object-contain"
                              />
                              <button
                                type="button"
                                className="absolute right-2 top-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-hairline bg-surface-1 text-ink-muted hover:text-semantic-error"
                                aria-label={`Remove image for option ${optionIndex + 1}`}
                                title="Remove image"
                                disabled={optionUploading}
                                onClick={() =>
                                  removeOptionImage(card.localId, optionIndex)
                                }
                              >
                                <IconTrash />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={addQuestionCard}>
              Add question
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={savingAll}
              onClick={() => void handleSaveAndExit()}
            >
              {savingAll ? "Saving…" : "Save"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
