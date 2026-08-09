import { z } from "zod";
import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import {
  buildImageKey,
  createPresignedPutUrl,
  isAllowedImageType,
  publicUrlForKey,
} from "@/lib/r2";

const bodySchema = z.object({
  quizId: z.string().uuid(),
  contentType: z.string().min(1),
  kind: z.enum(["question", "option"]).default("question"),
});

export async function POST(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { quizId, contentType, kind } = parsed.data;

  if (!isAllowedImageType(contentType)) {
    return jsonError(
      "Unsupported content type. Allowed: image/jpeg, image/png, image/webp, image/gif",
      400,
    );
  }

  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  try {
    const key = buildImageKey(quizId, kind, contentType);
    const uploadUrl = await createPresignedPutUrl({ key, contentType });
    const publicUrl = publicUrlForKey(key);

    return jsonOk({ uploadUrl, publicUrl, key });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create upload URL";
    if (message.startsWith("Missing environment variable:")) {
      return jsonError("Image uploads are not configured", 503);
    }
    console.error("[upload/presign]", err);
    return jsonError("Failed to create upload URL", 500);
  }
}
