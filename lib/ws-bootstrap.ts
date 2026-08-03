export async function bootstrapWsSession(payload: {
  sessionId: string;
  sessionCode: string;
  quizId: string;
  hostUserId: string;
  questions: Array<{
    id: string;
    questionDescription: string;
    quesImgLink: string | null;
    questionType: string;
    analyticsType: string;
    score: number;
    duration: number;
    position: number;
    options: Array<{
      id: string;
      optionDescription: string;
      optImgLink: string | null;
      optionNature: string;
    }>;
  }>;
}) {
  const baseUrl = process.env.WS_SERVER_URL ?? "http://localhost:3001";
  const secret = process.env.WS_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("WS_INTERNAL_SECRET is not set");
  }

  const res = await fetch(`${baseUrl}/internal/sessions/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to bootstrap WS session: ${res.status} ${text}`);
  }

  return res.json();
}
