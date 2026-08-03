import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/codes";

export async function generateUniqueSessionCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    const existing = await prisma.quizSession.findUnique({
      where: { sessionCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique session code");
}
