import {
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Client-side max upload size (bytes). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (client) return client;

  const accountId = requireEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function isAllowedImageType(
  contentType: string,
): contentType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

export function buildQuestionImageKey(
  quizId: string,
  contentType: AllowedImageType,
): string {
  const ext = EXT_BY_TYPE[contentType];
  return `quizzes/${quizId}/questions/${randomUUID()}.${ext}`;
}

export function buildOptionImageKey(
  quizId: string,
  contentType: AllowedImageType,
): string {
  const ext = EXT_BY_TYPE[contentType];
  return `quizzes/${quizId}/options/${randomUUID()}.${ext}`;
}

export type UploadKind = "question" | "option";

export function buildImageKey(
  quizId: string,
  kind: UploadKind,
  contentType: AllowedImageType,
): string {
  return kind === "option"
    ? buildOptionImageKey(quizId, contentType)
    : buildQuestionImageKey(quizId, contentType);
}

export function publicUrlForKey(key: string): string {
  const base = (
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  if (!base) {
    throw new Error(
      "Missing environment variable: R2_PUBLIC_BASE_URL (or R2_PUBLIC_URL)",
    );
  }
  return `${base}/${key}`;
}

export async function createPresignedPutUrl(params: {
  key: string;
  contentType: AllowedImageType;
  expiresInSeconds?: number;
}): Promise<string> {
  const bucket = requireEnv("R2_BUCKET_NAME");
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: params.expiresInSeconds ?? 60,
  });
}

export async function putObject(params: {
  key: string;
  contentType: AllowedImageType;
  body: Buffer;
}): Promise<void> {
  const bucket = requireEnv("R2_BUCKET_NAME");
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
      Body: params.body,
    }),
  );
}

/**
 * Deletes all images associated with a quiz (questions and options) from R2.
 */
export async function deleteQuizImages(quizId: string): Promise<void> {
  try {
    const bucket = requireEnv("R2_BUCKET_NAME");
    const client = getR2Client();
    const prefix = `quizzes/${quizId}/`;

    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCommand: any = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResult = (await client.send(listCommand)) as any;

      if (!listResult.Contents || listResult.Contents.length === 0) {
        break; // No more files to delete
      }

      const keysToDelete = listResult.Contents.map((item: any) => ({
        Key: item.Key,
      })).filter((item: any) => item.Key !== undefined) as { Key: string }[];

      if (keysToDelete.length > 0) {
        const deleteCommand: any = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keysToDelete,
            Quiet: true,
          },
        });
        await client.send(deleteCommand);
      }

      isTruncated = listResult.IsTruncated ?? false;
      continuationToken = listResult.NextContinuationToken;
    }
  } catch (error) {
    // We log the error but don't throw it, so that if R2 is not configured,
    // or if the deletion fails, it doesn't break the quiz deletion process.
    console.error(`Failed to delete images from R2 for quiz ${quizId}:`, error);
  }
}
