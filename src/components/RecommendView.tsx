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
    <div
      className="scorebar"
      role="img"
      aria-label={`期待値${pt(entry.mean)}ポイント、探索ボーナス${pt(entry.bonus)}ポイント`}
    >
      <span className="seg seg-mean" style={{ width: `${meanW}%` }} />
      <span className="seg seg-bonus" style={{ width: `${bonusW}%` }} />
    </div>
  );
}

export default function RecommendView({ data, today, onPick, onLoadSample }: Props) {
  const [genreSel, setGenreSel] = useState<ReadonlySet<string>>(new Set());
  const [maxWalk, setMaxWalk] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const active = data.restaurants.filter((r) => !r.archived);

  if (active.length === 0) {
    return (
      <section className="view">
        <div className="card empty">
          <h2>メニューが空です</h2>
          <p className="muted">
            「おみせ」からお店を仕入れるか、見本メニューで試運転できます。
          </p>
          <button className="btn primary" onClick={onLoadSample}>
            見本メニューを入れる
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
  const maxTotal = entries.reduce((m, e) => Math.max(m, e.score), 0) || 1;
  const top = entries[0];
  const sel = entries.find((e) => e.restaurant.id === selectedId) ?? top;

  const toggleGenre = (id: string) => {
    setGenreSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exploitDay = top !== undefined && top.reason.kind === 'exploit';

  return (
    <section className="view view-today">
      <div className="led-row">
        <div className="led-cell">
          <span className="led-label">総ランチ</span>
          <span className="led-value">{stats.totalVisits}</span>
        </div>
        <div className="led-cell">
          <span className="led-label">開拓率</span>
          <span className="led-value">
            {stats.totalActive > 0
              ? Math.round((stats.exploredCount / stats.totalActive) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="led-cell">
          <span className="led-label">平均満足</span>
          <span className="led-value">
            {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '--'}
          </span>
        </div>
      </div>

      {top && (
        <div className={exploitDay ? 'signboard steady' : 'signboard explore'}>
          <strong>{exploitDay ? '本日は安定営業' : '本日は開拓日和'}</strong>
          <span>
            {exploitDay ? '実績の味が強い日です' : '新規・ご無沙汰の店に妙味あり'}
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
            {g.label}
          </button>
        ))}
        {[5, 10].map((w) => (
          <button
            key={w}
            className={maxWalk === w ? 'chip on' : 'chip'}
            onClick={() => setMaxWalk(maxWalk === w ? null : w)}
          >
            徒歩{w}分以内
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
        <div className="tiles">
          {entries.map((e, i) => {
            const isSel = sel !== undefined && sel.restaurant.id === e.restaurant.id;
            return (
              <button
                key={e.restaurant.id}
                className={isSel ? 'tile on' : 'tile'}
                aria-label={`${i + 1}位 ${e.restaurant.name} ${pt(e.score)}ポイント`}
                onClick={() => setSelectedId(e.restaurant.id)}
              >
                <span className={i === 0 ? 'tile-rank no1' : 'tile-rank'}>{i + 1}</span>
                {e.rawCount === 0 && <span className="sticker">新発売</span>}
                <span className="tile-name">{e.restaurant.name}</span>
                <span className="tile-genre">
                  {genreOf(e.restaurant.genreId).label}
                  {e.restaurant.walkMin !== undefined &&
                    `・徒歩${e.restaurant.walkMin}分`}
                </span>
                <span className="tile-stats">
                  {e.rawCount > 0
                    ? `★${(e.rawMean ?? 0).toFixed(1)}・${e.rawCount}回・${formatDaysAgo(e.daysSinceLast)}`
                    : '初登場・データなし'}
                </span>
                <span className="tile-bottom">
                  <ScoreBar entry={e} max={maxTotal} />
                  <span className="pt-chip">{pt(e.score)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {sel && (
        <div className="lcd">
          <div className="lcd-text">
            <p className="lcd-name">▶ {sel.restaurant.name}</p>
            <p className="lcd-calc">
              期待値{pt(sel.mean)} + 探索{pt(sel.bonus)} = {pt(sel.score)}pt
            </p>
            <p className="lcd-reason">{sel.reason.text}</p>
          </div>
          <button className="decide" onClick={() => onPick(sel.restaurant.id)}>
            これに
            <br />
            決定
          </button>
        </div>
      )}
    </section>
  );
}
