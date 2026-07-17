export interface Restaurant {
  id: string;
  name: string;
  genreId: string;
  walkMin?: number;
  priceBand?: 1 | 2 | 3;
  memo?: string;
  archived: boolean;
  createdAt: string; // YYYY-MM-DD
}

export interface Visit {
  id: string;
  restaurantId: string;
  date: string; // YYYY-MM-DD
  rating: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export type ExploreLevel = 'low' | 'mid' | 'high';
export type MemoryLevel = 'forever' | 'slow' | 'normal' | 'fast';

export interface Settings {
  explore: ExploreLevel;
  memory: MemoryLevel;
}

export interface AppData {
  restaurants: Restaurant[];
  visits: Visit[];
  settings: Settings;
}

export interface Genre {
  id: string;
  label: string;
  emoji: string;
}

export const GENRES: Genre[] = [
  { id: 'ramen', label: 'ラーメン', emoji: '🍜' },
  { id: 'curry', label: 'カレー', emoji: '🍛' },
  { id: 'teishoku', label: '定食', emoji: '🍱' },
  { id: 'washoku', label: '和食・寿司', emoji: '🍣' },
  { id: 'yoshoku', label: '洋食・パスタ', emoji: '🍝' },
  { id: 'burger', label: 'バーガー', emoji: '🍔' },
  { id: 'ethnic', label: 'エスニック', emoji: '🌮' },
  { id: 'cafe', label: 'カフェ・軽食', emoji: '☕' },
  { id: 'other', label: 'その他', emoji: '🍽️' },
];

export function genreOf(id: string): Genre {
  return GENRES.find((g) => g.id === id) ?? GENRES[GENRES.length - 1];
}

export const PRICE_LABELS: Record<1 | 2 | 3, string> = {
  1: '～¥800',
  2: '¥800～1,200',
  3: '¥1,200～',
};
