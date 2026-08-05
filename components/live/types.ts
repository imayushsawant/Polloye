export type PublicOption = {
  option_id: string;
  option_description: string;
  opt_img_link: string | null;
};

export type PublicQuestion = {
  question_id: string;
  question_desc: string;
  question_type: string;
  score: number;
  duration: number;
  options: PublicOption[];
};

export type LeaderboardRow = {
  participant_id?: string;
  participant_name: string;
  total_score: number;
};
