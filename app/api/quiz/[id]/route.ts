import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteQuizImages } from "@/lib/r2";
import { updateQuizSchema } from "@/lib/validations/quiz";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id } = await context.params;
  const ownership = await requireQuizOwner(id, authResult.userId);
  if (ownership.error) return ownership.error;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: { options: true },
      },
    },
  });

  return jsonOk({ quiz });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id } = await context.params;
  const ownership = await requireQuizOwner(id, authResult.userId);
  if (ownership.error) return ownership.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const quiz = await prisma.quiz.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
    },
  });

  return jsonOk({ quiz });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const { id } = await context.params;
  const ownership = await requireQuizOwner(id, authResult.userId);
  if (ownership.error) return ownership.error;

  await prisma.quiz.delete({ where: { id } });

  // Delete all associated images from R2 (failures are logged but won't prevent quiz deletion)
  await deleteQuizImages(id);

  return jsonOk({ success: true });
}
