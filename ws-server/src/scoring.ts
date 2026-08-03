import type { LiveOption, LiveQuestion } from "./types.js";

/** Wrong answers score 0. Correct answers use speed decay in ms. */
export function calculatePoints(params: {
  question: LiveQuestion;
  selectedOptionIds: string[];
  elapsedMs: number;
}): number {
  const { question, selectedOptionIds, elapsedMs } = params;
  if (!isAnswerCorrect(question, selectedOptionIds)) return 0;

  const duration = question.duration;
  if (duration <= 0) return 0;

  const elapsed = Math.max(0, elapsedMs);
  return Math.max(
    0,
    Math.floor((question.score * (duration - elapsed)) / duration),
  );
}

export function isAnswerCorrect(
  question: LiveQuestion,
  selectedOptionIds: string[],
): boolean {
  const correctIds = question.options
    .filter((o) => o.optionNature === "CORRECT")
    .map((o) => o.id)
    .sort();
  const selected = [...selectedOptionIds].sort();

  if (correctIds.length !== selected.length) return false;
  return correctIds.every((id, i) => id === selected[i]);
}

export function buildOptionCounts(
  options: LiveOption[],
  responses: Iterable<{ optionIds: string[] }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const option of options) counts[option.id] = 0;
  for (const response of responses) {
    for (const optionId of response.optionIds) {
      if (optionId in counts) counts[optionId] += 1;
    }
  }
  return counts;
}

export function publicQuestionPayload(question: LiveQuestion) {
  return {
    question_id: question.id,
    question_desc: question.questionDescription,
    ques_img_link: question.quesImgLink,
    score: question.score,
    analytics_type: question.analyticsType,
    question_type: question.questionType,
    duration: question.duration,
    position: question.position,
    options: question.options.map((o) => ({
      option_id: o.id,
      option_description: o.optionDescription,
      opt_img_link: o.optImgLink,
      // nature hidden until reveal
    })),
  };
}
