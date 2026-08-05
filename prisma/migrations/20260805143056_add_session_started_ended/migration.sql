-- AlterTable
ALTER TABLE "quiz_session" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "quiz_session_state_conductedAt_idx" ON "quiz_session"("state", "conductedAt");
