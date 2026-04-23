export interface Grammar {
  id: string;
  name: string;
  summary: string;
  detail: string | null;
  examples: string;
  usage_scene: string;
  frequency: number;
  play_count: number;
  last_played_at: string | null;
  created_at: string;
  lesson_id: string | null;
  image_url: string | null;
}

export interface SpeakingLog {
  id: string;
  user_id: string;
  grammar_id: string;
  speech_text: string;
  scores: number[];
  total_score: number;
  comment: string;
  created_at: string;
}

export interface Expression {
  id: string;
  category: string;
  expression: string;
  meaning: string;
  conversation: string;
  usage_scene: string;
  frequency: number;
  play_count: number;
  last_played_at: string | null;
  created_at: string;
  lesson_id: string | null;
}

export interface Lesson {
  id: string;
  level: number;
  lesson_no: string;
  topic: string;
  status: "未登録" | "練習中" | "習得済み";
}

export interface PracticeLog {
  id: string;
  practiced_at: string;
  created_at: string;
  grammar_done_count: number;
  expression_done_count: number;
  speaking_count: number;
}

export interface NativeCampLog {
  id: string;
  user_id: string;
  logged_at: string;
  count: number;
  minutes: number;
  created_at: string;
}

export interface SpeakingScore {
  id: string;
  user_id: string;
  score: number;
  tested_at: string;
  created_at: string;
}

export interface YoutubeChannel {
  id: string;
  user_id: string;
  channel_name: string;
  channel_url: string;
  archived: boolean;
  created_at: string;
}

export interface YoutubeVideo {
  id: string;
  channel_id: string;
  title: string;
  video_url: string;
  duration: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  sort_order: number;
}

export interface YoutubeLog {
  id: string;
  user_id: string;
  video_id: string;
  lap: number;
  completed_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  baseline_repeating: number;
  baseline_speaking: number;
  baseline_nativecamp: number;
  baseline_shadowing: number;
  speaking_test_day: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedGrammar {
  name: string;
  summary: string;
  detail?: string;
  examples: string[];
  usage_scene: string;
  frequency: number;
}

export interface ExtractedExpression {
  category: string;
  expression: string;
  meaning: string;
  conversation: string[];
  usage_scene: string;
  frequency: number;
}

export interface ExtractResult {
  grammar: ExtractedGrammar[];
  expressions: ExtractedExpression[];
}
