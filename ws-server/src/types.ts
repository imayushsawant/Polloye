export type QuestionType = "MCQ" | "MSQ" | "TRUE_FALSE";
export type OptionNature = "CORRECT" | "WRONG";

export type LiveOption = {
  id: string;
  optionDescription: string;
  optImgLink: string | null;
  optionNature: OptionNature;
};

export type LiveQuestion = {
  id: string;
  questionDescription: string;
  quesImgLink: string | null;
  questionType: QuestionType;
  analyticsType: string;
  score: number;
  duration: number;
  position: number;
  options: LiveOption[];
};

export type LiveResponse = {
  participantId: string;
  optionIds: string[];
  submittedAt: number;
  pointEarned: number;
};

export type SessionPhase =
  | "lobby"
  | "question_active"
  | "answer_revealed"
  | "leaderboard"
  | "finished";

export type LiveSession = {
  sessionId: string;
  sessionCode: string;
  quizId: string;
  hostUserId: string;
  questions: LiveQuestion[];
  phase: SessionPhase;
  currentQuestionIndex: number;
  hostConnected: boolean;
  hostSocketId: string | null;
  /** participantId -> socketId (latest) */
  participantSockets: Map<string, string>;
  /** participantId -> display name + running score (in-memory until flush) */
  participants: Map<
    string,
    { name: string; totalScore: number; joinedAt: number }
  >;
  /** responses for the active question only */
  activeResponses: Map<string, LiveResponse>;
  /** participants blocked from answering current question (e.g. mid-question reconnect) */
  blockedFromCurrentQuestion: Set<string>;
  questionShownAt: number | null;
  questionsSinceLeaderboard: number;
  revealTimer: ReturnType<typeof setTimeout> | null;
  nextTimer: ReturnType<typeof setTimeout> | null;
};

export type HostJwt = {
  role: "host";
  sessionId: string;
  sessionCode: string;
  userId: string;
};

export type ParticipantJwt = {
  role: "participant";
  sessionId: string;
  sessionCode: string;
  participantId: string;
  participantName: string;
};

export type WsJwt = HostJwt | ParticipantJwt;
