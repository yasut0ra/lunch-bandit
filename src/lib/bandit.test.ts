import { describe, expect, it } from 'vitest';
import type { BanditParams } from './bandit';
import {
  computeScores,
  daysBetween,
  normalizeRating,
  paramsFromSettings,
} from './bandit';
import type { Restaurant, Visit } from './types';

const TODAY = '2026-07-17';

const P: BanditParams = { c: 0.4, gammaPerDay: 1, priorMean: 0.7, priorCount: 1 };

let seq = 0;

function store(name: string, archived = false): Restaurant {
  seq += 1;
  return { id: `r${seq}`, name, genreId: 'other', archived, createdAt: '2026-06-01' };
}

function visit(r: Restaurant, date: string, rating: Visit['rating']): Visit {
  seq += 1;
  return { id: `v${seq}`, restaurantId: r.id, date, rating };
}

function daysAgo(n: number): string {
  const ms = Date.UTC(2026, 6, 17) - n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

describe('normalizeRating', () => {
  it('maps 1..5 stars onto [0,1]', () => {
    expect(normalizeRating(1)).toBe(0);
    expect(normalizeRating(3)).toBe(0.5);
    expect(normalizeRating(5)).toBe(1);
  });
});

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-07-10', '2026-07-17')).toBe(7);
    expect(daysBetween('2026-07-17', '2026-07-17')).toBe(0);
  });
});

describe('computeScores', () => {
  it('ranks an unexplored store above a mediocre regular', () => {
    const regular = store('regular');
    const fresh = store('fresh');
    const visits = [1, 3, 6, 10, 15, 20].map((d) =>
      visit(regular, daysAgo(d), 3),
    );
    const entries = computeScores([regular, fresh], visits, P, TODAY);
    expect(entries[0].restaurant.id).toBe(fresh.id);
    expect(entries[0].reason.kind).toBe('unexplored');
  });

  it('ranks the higher-rated store first when counts are equal', () => {
    const good = store('good');
    const bad = store('bad');
    const visits = [
      ...[2, 9, 16].map((d) => visit(good, daysAgo(d), 5)),
      ...[2, 9, 16].map((d) => visit(bad, daysAgo(d), 2)),
    ];
    const entries = computeScores([good, bad], visits, P, TODAY);
    expect(entries[0].restaurant.id).toBe(good.id);
  });

  it('shrinks the exploration bonus as visits accumulate', () => {
    const rare = store('rare');
    const frequent = store('frequent');
    const visits = [
      visit(rare, daysAgo(3), 4),
      ...[1, 2, 4, 8, 12, 18].map((d) => visit(frequent, daysAgo(d), 4)),
    ];
    const entries = computeScores([rare, frequent], visits, P, TODAY);
    const rareEntry = entries.find((e) => e.restaurant.id === rare.id)!;
    const freqEntry = entries.find((e) => e.restaurant.id === frequent.id)!;
    expect(rareEntry.bonus).toBeGreaterThan(freqEntry.bonus);
  });

  it('discounts old visits so stale stores regain bonus', () => {
    const stale = store('stale');
    const recent = store('recent');
    const visits = [
      ...[60, 61, 62].map((d) => visit(stale, daysAgo(d), 4)),
      ...[1, 2, 3].map((d) => visit(recent, daysAgo(d), 4)),
    ];
    const decayed: BanditParams = { ...P, gammaPerDay: 0.99 };
    const entries = computeScores([stale, recent], visits, decayed, TODAY);
    const staleEntry = entries.find((e) => e.restaurant.id === stale.id)!;
    const recentEntry = entries.find((e) => e.restaurant.id === recent.id)!;
    expect(staleEntry.effCount).toBeLessThan(recentEntry.effCount);
    expect(staleEntry.bonus).toBeGreaterThan(recentEntry.bonus);
  });

  it('breaks exact ties deterministically per day without distorting scores', () => {
    const a = store('a');
    const b = store('b');
    const first = computeScores([a, b], [], P, TODAY);
    const second = computeScores([a, b], [], P, TODAY);
    expect(first.map((e) => e.restaurant.id)).toEqual(
      second.map((e) => e.restaurant.id),
    );
    expect(first[0].score).toBe(first[1].score);

    const otherDay = computeScores([a, b], [], P, '2026-07-18');
    for (const e of otherDay) {
      const base = first.find((f) => f.restaurant.id === e.restaurant.id)!;
      expect(e.score).toBe(base.score);
    }
  });

  it('never lets the tiebreak override a real score difference', () => {
    const worse = store('worse');
    const better = store('better');
    const visits = [
      visit(worse, daysAgo(4), 3),
      visit(better, daysAgo(4), 4),
    ];
    for (const day of ['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20']) {
      const entries = computeScores([worse, better], visits, P, day);
      expect(entries[0].restaurant.id).toBe(better.id);
    }
  });

  it('excludes archived stores and sorts descending', () => {
    const a = store('a');
    const gone = store('gone', true);
    const b = store('b');
    const visits = [visit(a, daysAgo(1), 5), visit(b, daysAgo(1), 2)];
    const entries = computeScores([a, gone, b], visits, P, TODAY);
    expect(entries.map((e) => e.restaurant.id)).not.toContain(gone.id);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].score).toBeGreaterThanOrEqual(entries[i].score);
    }
  });
});

describe('paramsFromSettings', () => {
  it('maps the level presets onto c and gamma', () => {
    const p = paramsFromSettings({ explore: 'mid', memory: 'normal' });
    expect(p.c).toBe(0.4);
    expect(p.gammaPerDay).toBe(0.995);
  });
});
