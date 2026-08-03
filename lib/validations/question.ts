import { z } from "zod";

const SCORE_VALUES = [1000, 2000, 3000, 4000, 5000] as const;
const MIN_DURATION_MS = 10_000;
const MAX_DURATION_MS = 180_000;

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
      .min(MIN_DURATION_MS, "Duration must be at least 10 seconds")
      .max(MAX_DURATION_MS, "Duration must be at most 3 minutes"),
    position: z.number().int().min(0, "Position must be 0 or greater"),
  })
  .superRefine((question, ctx) => {
    const description = question.questionDescription.trim();
    if (!hasImage(question.quesImgLink) && description.length < 10) {
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

    if (
      question.questionType === "MCQ" ||
      question.questionType === "TRUE_FALSE"
    ) {
      if (correctCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message:
            "MCQ and True/False questions must have exactly 1 correct option",
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
