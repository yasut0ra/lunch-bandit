import type { AppData, Settings } from './types';

const KEY = 'lunch-bandit:v1';

export const DEFAULT_SETTINGS: Settings = { explore: 'mid', memory: 'normal' };

export function emptyData(): AppData {
  return { restaurants: [], visits: [], settings: { ...DEFAULT_SETTINGS } };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    return coerce(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function parseImport(text: string): AppData {
  const parsed: unknown = JSON.parse(text);
  return coerce(parsed);
}

function coerce(parsed: unknown): AppData {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JSONの形式が違います');
  }
  const obj = parsed as Partial<AppData>;
  if (!Array.isArray(obj.restaurants) || !Array.isArray(obj.visits)) {
    throw new Error('restaurants / visits が見つかりません');
  }
  const settings = obj.settings ?? DEFAULT_SETTINGS;
  return {
    restaurants: obj.restaurants,
    visits: obj.visits,
    settings: {
      explore: settings.explore ?? DEFAULT_SETTINGS.explore,
      memory: settings.memory ?? DEFAULT_SETTINGS.memory,
    },
  };
}
