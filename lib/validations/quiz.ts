import { z } from "zod";

export const createQuizSchema = z.object({
  name: z.string().min(1, "Quiz name is required"),
  description: z.string().optional(),
});

export const updateQuizSchema = z
  .object({
    name: z.string().min(1, "Quiz name is required").optional(),
    description: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    { message: "At least one of name or description must be provided" },
  );

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
