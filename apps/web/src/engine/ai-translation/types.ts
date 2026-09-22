// 对应 §3.7（AI 缓存），F4/F5：Claude API 预生成 + 缓存，App 只读不现取
import type { MoodTier, PetSpecies } from "../companion/types";

export type PetStatusSentences = Record<PetSpecies, Record<MoodTier, string>>;

export interface Anchor {
  anchor_id: string;
  content_pack_id: string;
  zone: "eco" | "exhibit" | "community";
  device_type: string;
  display_name: string;
  scan_target_ref: string;
  simulated_data: Record<string, number>;
  daily_greeting_text: string | null;
  daily_greeting_generated_at: number | null;
  story_chapters: StoryChapter[];
}

export interface StoryChapter {
  chapter_id: string;
  order_index: number;
  title: string;
  body_text: string;
  unlock_field: string;
  unlock_threshold: number;
}
