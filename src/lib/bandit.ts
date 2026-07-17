import type { Restaurant, Settings, Visit } from './types';

export interface BanditParams {
  /** 探索係数。UCBボーナスの強さ */
  c: number;
  /** 1日あたりの記憶減衰率。1で減衰なし */
  gammaPerDay: number;
  /** 未訪問店に置く楽観的事前分布の平均([0,1]) */
  priorMean: number;
  /** 事前分布の擬似訪問回数 */
  priorCount: number;
}

export const EXPLORE_C: Record<Settings['explore'], number> = {
  low: 0.2,
  mid: 0.4,
  high: 0.7,
};

export const MEMORY_GAMMA: Record<Settings['memory'], number> = {
  forever: 1,
  slow: 0.999,
  normal: 0.995,
  fast: 0.99,
};

export function paramsFromSettings(s: Settings): BanditParams {
  return {
    c: EXPLORE_C[s.explore],
    gammaPerDay: MEMORY_GAMMA[s.memory],
    priorMean: 0.7,
    priorCount: 1,
  };
}

export type ReasonKind = 'unexplored' | 'explore' | 'exploit';

export interface Reason {
  kind: ReasonKind;
  text: string;
}

export interface ScoreEntry {
  restaurant: Restaurant;
  /** 実訪問回数 */
  rawCount: number;
  /** 表示用の平均⭐(1〜5)。未訪問はnull */
  rawMean: number | null;
  /** 減衰込みの有効訪問回数(事前分布ぶんを含む) */
  effCount: number;
  /** 事後平均([0,1]) */
  mean: number;
  /** 探索ボーナス */
  bonus: number;
  /** mean + bonus。表示とソートの主キー */
  score: number;
  /** 日付シードの決定的タイブレーク。完全同点(未開拓の双子など)だけを日替わりで並べ替える */
  tiebreak: number;
  daysSinceLast: number | null;
  reason: Reason;
}

export function normalizeRating(r: number): number {
  return (r - 1) / 4;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** FNV-1a。日付+店IDから[0,1)の決定的な値を作る(同点タイブレーク用) */
function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4_294_967_296;
}

function buildReason(
  rawCount: number,
  rawMean: number | null,
  mean: number,
  bonus: number,
  daysSinceLast: number | null,
): Reason {
  if (rawCount === 0) {
    return {
      kind: 'unexplored',
      text: 'まだ未開拓。初訪問ボーナスが満額で乗っています',
    };
  }
  if (bonus >= mean) {
    if (daysSinceLast !== null && daysSinceLast >= 21) {
      return {
        kind: 'explore',
        text: `${daysSinceLast}日ご無沙汰。記憶が薄れて探索ボーナスが優勢です`,
      };
    }
    return {
      kind: 'explore',
      text: `まだ${rawCount}回だけ。伸びしろ(探索ボーナス)に賭ける日`,
    };
  }
  return {
    kind: 'exploit',
    text: `平均★${(rawMean ?? 0).toFixed(1)}(${rawCount}回)の実力派。今日は堅実に`,
  };
}

/**
 * 割引UCB。各店について
 *   score = 事後平均 + c * sqrt(ln(N) / n)
 * を計算する。n は日数減衰γ^d で割り引いた有効訪問回数+事前分布、
 * N は候補全体の n の合計。未訪問店は楽観的事前分布だけを持つので、
 * 高めの平均+大きなボーナスで自然に上位へ浮上する。
 */
export function computeScores(
  restaurants: Restaurant[],
  visits: Visit[],
  params: BanditParams,
  today: string,
): ScoreEntry[] {
  const candidates = restaurants.filter((r) => !r.archived);

  const byId = new Map<string, Visit[]>();
  for (const v of visits) {
    const arr = byId.get(v.restaurantId);
    if (arr) arr.push(v);
    else byId.set(v.restaurantId, [v]);
  }

  const prelim = candidates.map((r) => {
    const vs = byId.get(r.id) ?? [];
    let effN = 0;
    let effSum = 0;
    let ratingSum = 0;
    let lastDays: number | null = null;
    for (const v of vs) {
      const d = daysBetween(v.date, today);
      const w = params.gammaPerDay === 1 ? 1 : Math.pow(params.gammaPerDay, d);
      effN += w;
      effSum += w * normalizeRating(v.rating);
      ratingSum += v.rating;
      if (lastDays === null || d < lastDays) lastDays = d;
    }
    const postN = effN + params.priorCount;
    const mean = (effSum + params.priorMean * params.priorCount) / postN;
    return {
      r,
      rawCount: vs.length,
      rawMean: vs.length > 0 ? ratingSum / vs.length : null,
      postN,
      mean,
      lastDays,
    };
  });

  const totalN = prelim.reduce((acc, p) => acc + p.postN, 0);
  // 候補が少ないうちに ln が 0 や負にならないよう下駄を履かせる
  const logTerm = Math.log(Math.max(totalN, Math.E));

  const entries: ScoreEntry[] = prelim.map((p) => {
    const bonus = params.c * Math.sqrt(logTerm / p.postN);
    return {
      restaurant: p.r,
      rawCount: p.rawCount,
      rawMean: p.rawMean,
      effCount: p.postN,
      mean: p.mean,
      bonus,
      score: p.mean + bonus,
      tiebreak: hash01(`${today}:${p.r.id}`),
      daysSinceLast: p.lastDays,
      reason: buildReason(p.rawCount, p.rawMean, p.mean, bonus, p.lastDays),
    };
  });

  // ジッターをスコアに足すと表示ptと順位が矛盾し得るので、同点時のみ効かせる
  entries.sort((a, b) => b.score - a.score || b.tiebreak - a.tiebreak);
  return entries;
}

export interface Stats {
  totalVisits: number;
  exploredCount: number;
  totalActive: number;
  avgRating: number | null;
}

export function computeStats(restaurants: Restaurant[], visits: Visit[]): Stats {
  const active = restaurants.filter((r) => !r.archived);
  const visitedIds = new Set(visits.map((v) => v.restaurantId));
  const exploredCount = active.filter((r) => visitedIds.has(r.id)).length;
  const avgRating =
    visits.length > 0
      ? visits.reduce((acc, v) => acc + v.rating, 0) / visits.length
      : null;
  return {
    totalVisits: visits.length,
    exploredCount,
    totalActive: active.length,
    avgRating,
  };
}
