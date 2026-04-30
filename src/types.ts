export type Top100Difficulty = 'foundation' | 'easy' | 'medium' | 'hard' | 'blocked';
export type Top100Priority = 'smoke_test' | 'try_now' | 'stdlib_first_then_try' | 'define_foundation' | 'defer';
export type Top100FrontendGroup = Top100Priority | 'blocked';

export type Label = {
  en: string;
  zh: string;
  description_zh?: string;
};

export type GroupLabel = {
  en: string;
  zh: string;
};

export type Top100Item = {
  id: number;
  rank: number;
  rank_label: string;
  title: string;
  source_url: string;
  module_path: string;
  area: string;
  area_label: GroupLabel;
  difficulty: Top100Difficulty;
  difficulty_label: Label;
  priority: Top100Priority;
  priority_label: Label;
  frontend_group: Top100FrontendGroup;
  frontend_group_label: GroupLabel;
  status: {
    key: string;
    label_zh: string;
    label_en: string;
  };
  recommended: boolean;
  recommended_tier: 'first_batch' | 'next_review' | null;
  recommended_order: number | null;
  stdlib_signal: 'strong' | 'thin' | 'missing';
  search_hits: number;
  matched_modules: string[];
  top_modules: string[];
  keywords: string[];
  source_flags: {
    hard_on_freek_page: boolean;
    italic_on_freek_page: boolean;
    tags: string[];
  };
  notes: string;
  caveat: string | null;
};

export type Top100Group = {
  key: Top100FrontendGroup;
  order: number;
  label: GroupLabel;
  description_zh: string;
  count: number;
  item_ids: number[];
};

export type Top100Data = {
  schema_version: number;
  generated_on: string;
  source: {
    name: string;
    url: string;
    manifest_path: string;
    manifest_format: string;
  };
  summary: {
    total: number;
    by_area: Record<string, number>;
    by_difficulty: Record<Top100Difficulty, number>;
    by_priority: Record<Top100Priority, number>;
    by_frontend_group: Record<Top100FrontendGroup, number>;
  };
  recommended: {
    first_batch: number[];
    next_review: number[];
    description_zh: string;
  };
  labels: {
    areas: Record<string, Label>;
    difficulties: Record<Top100Difficulty, Label>;
    priorities: Record<Top100Priority, Label>;
    frontend_groups: Record<Top100FrontendGroup, {
      order: number;
      label_zh: string;
      label_en: string;
      description_zh: string;
    }>;
  };
  groups: Top100Group[];
  area_groups: Array<{ key: string; label: GroupLabel; count: number; item_ids: number[] }>;
  difficulty_groups: Array<{ key: Top100Difficulty; label: Label; count: number; item_ids: number[] }>;
  items: Top100Item[];
};

export type LoadedState =
  | { status: 'loading' }
  | { status: 'ready'; data: Top100Data }
  | { status: 'error'; message: string };
