import { useState } from 'react';
import type { AppData } from '../lib/types';
import { GENRES, genreOf } from '../lib/types';
import type { ScoreEntry } from '../lib/bandit';
import { computeScores, computeStats, paramsFromSettings } from '../lib/bandit';
import { formatDaysAgo } from '../lib/format';

interface Props {
  data: AppData;
  today: string;
  onPick: (restaurantId: string) => void;
  onLoadSample: () => void;
}

function pt(x: number): number {
  return Math.round(x * 100);
}

function ScoreBar({ entry, max }: { entry: ScoreEntry; max: number }) {
  const meanW = (entry.mean / max) * 100;
  const bonusW = (entry.bonus / max) * 100;
  return (
    <div className="scorebar-row">
      <div
        className="scorebar"
        role="img"
        aria-label={`期待値${pt(entry.mean)}ポイント、探索ボーナス${pt(entry.bonus)}ポイント`}
      >
        <span
          className="seg seg-mean"
          style={{ width: `${meanW}%` }}
          title={`期待値 ${pt(entry.mean)}pt`}
        />
        <span
          className="seg seg-bonus"
          style={{ width: `${bonusW}%` }}
          title={`探索ボーナス ${pt(entry.bonus)}pt`}
        />
      </div>
      <span className="scorept">{pt(entry.mean + entry.bonus)}pt</span>
    </div>
  );
}

export default function RecommendView({ data, today, onPick, onLoadSample }: Props) {
  const [genreSel, setGenreSel] = useState<ReadonlySet<string>>(new Set());
  const [maxWalk, setMaxWalk] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = data.restaurants.filter((r) => !r.archived);

  if (active.length === 0) {
    return (
      <section className="view">
        <div className="card empty">
          <p className="empty-emoji">🍽️</p>
          <h2>お店を登録して始めよう</h2>
          <p className="muted">
            「おみせ」タブから店を追加するか、サンプルデータで雰囲気を試せます。
          </p>
          <button className="btn primary" onClick={onLoadSample}>
            🎲 サンプルデータで試す
          </button>
        </div>
      </section>
    );
  }

  const genresPresent = GENRES.filter((g) => active.some((r) => r.genreId === g.id));
  const filtered = active.filter(
    (r) =>
      (genreSel.size === 0 || genreSel.has(r.genreId)) &&
      (maxWalk === null || (r.walkMin !== undefined && r.walkMin <= maxWalk)),
  );

  const entries = computeScores(
    filtered,
    data.visits,
    paramsFromSettings(data.settings),
    today,
  );
  const stats = computeStats(data.restaurants, data.visits);
  const maxTotal = entries.reduce((m, e) => Math.max(m, e.mean + e.bonus), 0) || 1;
  const top = entries[0];

  const toggleGenre = (id: string) => {
    setGenreSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="view">
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">総ランチ</span>
          <span className="stat-value">
            {stats.totalVisits}
            <small>回</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">開拓率</span>
          <span className="stat-value">
            {stats.totalActive > 0
              ? Math.round((stats.exploredCount / stats.totalActive) * 100)
              : 0}
            <small>%</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">平均満足度</span>
          <span className="stat-value">
            {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '–'}
            <small>⭐</small>
          </span>
        </div>
      </div>

      {top && (
        <div
          className={`banner ${
            top.reason.kind === 'exploit' ? 'banner-exploit' : 'banner-explore'
          }`}
        >
          <strong>
            {top.reason.kind === 'exploit' ? '😋 きょうは安定志向' : '🧭 きょうは開拓日和'}
          </strong>
          <span>
            {top.reason.kind === 'exploit'
              ? '実績のある店が強い日です'
              : '探索ボーナスが効いています。新しい一皿へ'}
          </span>
        </div>
      )}

      <div className="chips">
        {genresPresent.map((g) => (
          <button
            key={g.id}
            className={genreSel.has(g.id) ? 'chip on' : 'chip'}
            onClick={() => toggleGenre(g.id)}
          >
            {g.emoji} {g.label}
          </button>
        ))}
        {[5, 10].map((w) => (
          <button
            key={w}
            className={maxWalk === w ? 'chip on' : 'chip'}
            onClick={() => setMaxWalk(maxWalk === w ? null : w)}
          >
            🚶 {w}分以内
          </button>
        ))}
      </div>

      <div className="legend">
        <span className="key">
          <i className="sw sw-mean" /> 期待値
        </span>
        <span className="key">
          <i className="sw sw-bonus" /> 探索ボーナス
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="card empty">
          <p className="muted">条件に合うお店がありません。フィルタを緩めてみてください。</p>
        </div>
      ) : (
        <div className="cards">
          {entries.map((e, i) => {
            const g = genreOf(e.restaurant.genreId);
            const isTop = i === 0;
            const expanded =
              expandedId === null ? isTop : expandedId === e.restaurant.id;
            return (
              <article
                key={e.restaurant.id}
                className={isTop ? 'rcard top' : 'rcard'}
                onClick={() => setExpandedId(expanded ? '' : e.restaurant.id)}
              >
                <div className="rcard-head">
                  <span className={isTop ? 'rank gold' : 'rank'}>{i + 1}</span>
                  <span className="rname">
                    {g.emoji} {e.restaurant.name}
                  </span>
                </div>
                <ScoreBar entry={e} max={maxTotal} />
                <div className="rmeta">
                  {e.rawCount > 0 ? (
                    <span>
                      ⭐{(e.rawMean ?? 0).toFixed(1)}・{e.rawCount}回・
                      {formatDaysAgo(e.daysSinceLast)}
                    </span>
                  ) : (
                    <span className="chip-new">未開拓</span>
                  )}
                  {e.restaurant.walkMin !== undefined && (
                    <span className="muted">・徒歩{e.restaurant.walkMin}分</span>
                  )}
                </div>
                {expanded && (
                  <div className="rdetail">
                    <p className="reason">{e.reason.text}</p>
                    <p className="breakdown">
                      スコア内訳:期待値 <b>{pt(e.mean)}pt</b> + 探索ボーナス{' '}
                      <b>{pt(e.bonus)}pt</b>
                    </p>
                    <button
                      className="btn primary"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onPick(e.restaurant.id);
                      }}
                    >
                      🍽️ ここにする
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
