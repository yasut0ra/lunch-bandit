import { useState } from 'react';
import type { AppData, Restaurant } from '../lib/types';
import { GENRES, PRICE_LABELS, genreOf } from '../lib/types';

interface Props {
  data: AppData;
  onAdd: (r: Omit<Restaurant, 'id' | 'archived' | 'createdAt'>) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function StoresView({ data, onAdd, onToggleArchive, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [genreId, setGenreId] = useState('ramen');
  const [walkMin, setWalkMin] = useState('');
  const [priceBand, setPriceBand] = useState('');
  const [memo, setMemo] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      genreId,
      walkMin: walkMin !== '' ? Math.max(0, Number(walkMin)) : undefined,
      priceBand: priceBand !== '' ? (Number(priceBand) as 1 | 2 | 3) : undefined,
      memo: memo.trim() !== '' ? memo.trim() : undefined,
    });
    setName('');
    setWalkMin('');
    setPriceBand('');
    setMemo('');
    setOpen(false);
  };

  const visitStats = (id: string) => {
    const vs = data.visits.filter((v) => v.restaurantId === id);
    if (vs.length === 0) return '未開拓';
    const avg = vs.reduce((a, v) => a + v.rating, 0) / vs.length;
    return `⭐${avg.toFixed(1)}・${vs.length}回`;
  };

  const sorted = [...data.restaurants].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  return (
    <section className="view">
      {!open ? (
        <button className="btn primary wide" onClick={() => setOpen(true)}>
          + お店を追加
        </button>
      ) : (
        <div className="card form">
          <label className="field">
            店名 *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="らーめん 一番星"
            />
          </label>
          <label className="field">
            ジャンル
            <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.label}
                </option>
              ))}
            </select>
          </label>
          <div className="field-row">
            <label className="field">
              徒歩(分)
              <input
                type="number"
                min="0"
                value={walkMin}
                onChange={(e) => setWalkMin(e.target.value)}
                placeholder="5"
              />
            </label>
            <label className="field">
              価格帯
              <select value={priceBand} onChange={(e) => setPriceBand(e.target.value)}>
                <option value="">未設定</option>
                <option value="1">{PRICE_LABELS[1]}</option>
                <option value="2">{PRICE_LABELS[2]}</option>
                <option value="3">{PRICE_LABELS[3]}</option>
              </select>
            </label>
          </div>
          <label className="field">
            メモ
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="味玉が正義"
            />
          </label>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setOpen(false)}>
              キャンセル
            </button>
            <button className="btn primary" onClick={submit} disabled={!name.trim()}>
              追加する
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="card empty">
          <p className="muted">まだお店がありません。</p>
        </div>
      )}

      {sorted.map((r) => (
        <div key={r.id} className={r.archived ? 'card store-item archived' : 'card store-item'}>
          <div className="store-main">
            <span className="sname">
              {genreOf(r.genreId).emoji} {r.name}
            </span>
            <span className="smeta muted">
              {genreOf(r.genreId).label}
              {r.walkMin !== undefined && `・徒歩${r.walkMin}分`}
              {r.priceBand && `・${PRICE_LABELS[r.priceBand]}`}・{visitStats(r.id)}
            </span>
            {r.memo && <span className="smemo muted">📝 {r.memo}</span>}
          </div>
          <div className="store-actions">
            <button className="btn ghost small" onClick={() => onToggleArchive(r.id)}>
              {r.archived ? '復活' : '休止'}
            </button>
            <button
              className="btn ghost small danger"
              onClick={() => {
                const n = data.visits.filter((v) => v.restaurantId === r.id).length;
                if (confirm(`「${r.name}」を削除しますか?訪問記録${n}件も消えます`)) {
                  onDelete(r.id);
                }
              }}
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
