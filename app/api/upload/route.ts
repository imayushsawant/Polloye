import {
  jsonError,
  jsonOk,
  requireQuizOwner,
  requireSession,
} from "@/lib/api";
import {
  buildQuestionImageKey,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  publicUrlForKey,
  putObject,
} from "@/lib/r2";

export async function POST(request: Request) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const quizId = String(form.get("quizId") ?? "");
  const kind = String(form.get("kind") ?? "question");
  const file = form.get("file");

  if (!quizId) {
    return jsonError("quizId is required", 400);
  }
  if (kind !== "question") {
    return jsonError("Unsupported upload kind", 400);
  }
  if (!(file instanceof File)) {
    return jsonError("file is required", 400);
  }

  const contentType = file.type;
  if (!isAllowedImageType(contentType)) {
    return jsonError(
      "Unsupported content type. Allowed: image/jpeg, image/png, image/webp, image/gif",
      400,
    );
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return jsonError("Image must be between 1 byte and 5 MB", 400);
  }

  const ownership = await requireQuizOwner(quizId, authResult.userId);
  if (ownership.error) return ownership.error;

  try {
    const key = buildQuestionImageKey(quizId, contentType);
    const body = Buffer.from(await file.arrayBuffer());
    await putObject({ key, contentType, body });
    const publicUrl = publicUrlForKey(key);
    return jsonOk({ publicUrl, key }, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload image";
    if (message.startsWith("Missing environment variable:")) {
      return jsonError("Image uploads are not configured", 503);
    }
    console.error("[upload]", err);
    return jsonError("Failed to upload image", 500);
  }
}
