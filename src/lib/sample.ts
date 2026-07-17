import type { AppData, Restaurant, Visit } from './types';
import { DEFAULT_SETTINGS } from './storage';

interface SampleSpec {
  id: string;
  name: string;
  genreId: string;
  walkMin: number;
  priceBand: 1 | 2 | 3;
  memo?: string;
  visits: Array<[daysAgo: number, rating: 1 | 2 | 3 | 4 | 5]>;
}

const SPECS: SampleSpec[] = [
  {
    id: 'smp-ichibanboshi',
    name: 'らーめん 一番星',
    genreId: 'ramen',
    walkMin: 3,
    priceBand: 1,
    memo: '味玉トッピングが正義',
    visits: [[2, 4], [6, 5], [9, 4], [13, 4], [17, 5], [23, 4], [30, 3], [38, 5]],
  },
  {
    id: 'smp-koganeya',
    name: 'カレーの黄金屋',
    genreId: 'curry',
    walkMin: 5,
    priceBand: 1,
    visits: [[4, 3], [17, 4], [33, 2]],
  },
  {
    id: 'smp-sakura',
    name: '定食 さくら',
    genreId: 'teishoku',
    walkMin: 4,
    priceBand: 2,
    memo: '日替わりは早めに行かないと売り切れ',
    visits: [[1, 4], [8, 3], [15, 4], [26, 4], [41, 3]],
  },
  {
    id: 'smp-namine',
    name: '寿司処 波音',
    genreId: 'washoku',
    walkMin: 8,
    priceBand: 3,
    memo: 'ランチちらしがお得',
    visits: [[12, 5]],
  },
  {
    id: 'smp-burgerbase',
    name: 'バーガーBASE',
    genreId: 'burger',
    walkMin: 6,
    priceBand: 2,
    visits: [[5, 2], [20, 3]],
  },
  {
    id: 'smp-bowllabo',
    name: 'サラダボウルLABO',
    genreId: 'cafe',
    walkMin: 7,
    priceBand: 2,
    visits: [[3, 5], [11, 4]],
  },
  {
    id: 'smp-agura',
    name: '麺屋 胡座',
    genreId: 'ramen',
    walkMin: 9,
    priceBand: 1,
    visits: [[35, 3]],
  },
  {
    id: 'smp-gapao',
    name: 'タイ食堂 ガパオの森',
    genreId: 'ethnic',
    walkMin: 6,
    priceBand: 2,
    visits: [],
  },
  {
    id: 'smp-soleil',
    name: 'パスタ ソレイユ',
    genreId: 'yoshoku',
    walkMin: 5,
    priceBand: 2,
    visits: [],
  },
  {
    id: 'smp-komorebi',
    name: '蕎麦 木漏れ日',
    genreId: 'washoku',
    walkMin: 4,
    priceBand: 2,
    visits: [[7, 3], [19, 3], [31, 4], [44, 3]],
  },
];

function isoDaysAgo(todayISO: string, n: number): string {
  const [y, m, d] = todayISO.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) - n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildSampleData(todayISO: string): AppData {
  const restaurants: Restaurant[] = [];
  const visits: Visit[] = [];
  for (const spec of SPECS) {
    restaurants.push({
      id: spec.id,
      name: spec.name,
      genreId: spec.genreId,
      walkMin: spec.walkMin,
      priceBand: spec.priceBand,
      memo: spec.memo,
      archived: false,
      createdAt: isoDaysAgo(todayISO, 50),
    });
    spec.visits.forEach(([daysAgo, rating], i) => {
      visits.push({
        id: `${spec.id}-v${i}`,
        restaurantId: spec.id,
        date: isoDaysAgo(todayISO, daysAgo),
        rating,
      });
    });
  }
  return { restaurants, visits, settings: { ...DEFAULT_SETTINGS } };
}
