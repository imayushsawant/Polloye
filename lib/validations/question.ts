import { z } from "zod";

const SCORE_VALUES = [1000, 2000, 3000, 4000, 5000] as const;

/** Allowed question timers (ms): 30s, 45s, 1m, 2m, 3m, 5m */
export const DURATION_VALUES_MS = [
  30_000,
  45_000,
  60_000,
  120_000,
  180_000,
  300_000,
] as const;

export type DurationMs = (typeof DURATION_VALUES_MS)[number];

export const DURATION_OPTIONS: ReadonlyArray<{
  value: DurationMs;
  label: string;
}> = [
  { value: 30_000, label: "30 sec" },
  { value: 45_000, label: "45 sec" },
  { value: 60_000, label: "1 min" },
  { value: 120_000, label: "2 min" },
  { value: 180_000, label: "3 min" },
  { value: 300_000, label: "5 min" },
];

const questionTypeSchema = z.enum(["MCQ", "MSQ", "TRUE_FALSE"]);
const analyticsTypeSchema = z.enum(["BARCHART", "PIE_CHART", "DONUT_CHART"]);
const optionNatureSchema = z.enum(["CORRECT", "WRONG"]);

function hasImage(link: string | null | undefined): boolean {
  return typeof link === "string" && link.trim().length > 0;
}

export const optionSchema = z.object({
  optionDescription: z.string().max(150, "Option description max length is 150"),
  optImgLink: z.string().nullable().optional(),
  optionNature: optionNatureSchema,
});

export const questionSchema = z
  .object({
    questionDescription: z
      .string()
      .max(400, "Question description max length is 400"),
    quesImgLink: z.string().nullable().optional(),
    questionType: questionTypeSchema,
    analyticsType: analyticsTypeSchema.default("BARCHART"),
    score: z
      .number()
      .int()
      .refine(
        (value): value is (typeof SCORE_VALUES)[number] =>
          (SCORE_VALUES as readonly number[]).includes(value),
        { message: "Score must be one of 1000, 2000, 3000, 4000, or 5000" },
      ),
    duration: z
      .number()
      .int()
      .refine(
        (value): value is DurationMs =>
          (DURATION_VALUES_MS as readonly number[]).includes(value),
        {
          message:
            "Duration must be one of 30s, 45s, 1 min, 2 min, 3 min, or 5 min",
        },
      ),
    position: z.number().int().min(0, "Position must be 0 or greater"),
  })
  .superRefine((question, ctx) => {
    const description = question.questionDescription.trim();
    if (!hasImage(question.quesImgLink) && description.length < 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Question description must be at least 10 characters when no image is present",
        path: ["questionDescription"],
      });
    }
  });

export const questionWithOptionsSchema = z
  .object({
    question: questionSchema,
    options: z.array(optionSchema),
  })
  .superRefine((payload, ctx) => {
    const { question, options } = payload;
    const optionCount = options.length;

    if (question.questionType === "TRUE_FALSE") {
      if (optionCount !== 2) {
        ctx.addIssue({
          code: "custom",
          message: "True/False questions must have exactly 2 options",
          path: ["options"],
        });
      }
    } else if (optionCount < 2 || optionCount > 4) {
      ctx.addIssue({
        code: "custom",
        message: "Questions must have between 2 and 4 options",
        path: ["options"],
      });
    }

    // TRUE_FALSE labels ("True"/"False") are shorter than 10 chars by design.
    if (question.questionType !== "TRUE_FALSE") {
      options.forEach((option, index) => {
        const description = option.optionDescription.trim();
        if (!hasImage(option.optImgLink) && description.length < 10) {
          ctx.addIssue({
            code: "custom",
            message:
              "Option description must be at least 10 characters when no image is present",
            path: ["options", index, "optionDescription"],
          });
        }
      });
    }

    const correctCount = options.filter(
      (option) => option.optionNature === "CORRECT",
    ).length;
    const wrongCount = options.filter(
      (option) => option.optionNature === "WRONG",
    ).length;

    if (question.questionType === "TRUE_FALSE") {
      if (correctCount !== 1 || wrongCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message:
            "True/False questions must have exactly one correct and one wrong option",
          path: ["options"],
        });
      }
    } else if (question.questionType === "MCQ") {
      if (correctCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "MCQ questions must have exactly 1 correct option",
          path: ["options"],
        });
      }
    }

    if (question.questionType === "MSQ") {
      if (correctCount < 1 || correctCount > 4) {
        ctx.addIssue({
          code: "custom",
          message: "MSQ questions must have between 1 and 4 correct options",
          path: ["options"],
        });
      }
      if (correctCount > optionCount) {
        ctx.addIssue({
          code: "custom",
          message: "Correct options cannot exceed total options",
          path: ["options"],
        });
      }
    }
  });

export type QuestionWithOptionsInput = z.infer<typeof questionWithOptionsSchema>;
