import { daysBetween } from './bandit';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDateJP(iso: string, today?: string): string {
  if (today !== undefined) {
    const d = daysBetween(iso, today);
    if (d === 0) return 'きょう';
    if (d === 1) return 'きのう';
  }
  const [y, m, day] = iso.split('-').map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

export function formatDaysAgo(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'きょう';
  if (days === 1) return 'きのう';
  return `${days}日前`;
}

export function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}
