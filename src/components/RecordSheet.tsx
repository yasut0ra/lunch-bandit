import { useState } from 'react';
import type { Restaurant, Visit } from '../lib/types';
import { genreOf } from '../lib/types';

interface Props {
  restaurants: Restaurant[];
  defaultRestaurantId?: string;
  today: string;
  onSave: (v: Omit<Visit, 'id'>) => void;
  onClose: () => void;
}

export default function RecordSheet({
  restaurants,
  defaultRestaurantId,
  today,
  onSave,
  onClose,
}: Props) {
  const [restaurantId, setRestaurantId] = useState(
    defaultRestaurantId ?? restaurants[0]?.id ?? '',
  );
  const [date, setDate] = useState(today);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>
          食券を切る<span className="sheet-sub">ランチを記録</span>
        </h2>
        {restaurants.length === 0 ? (
          <p className="muted">先に「おみせ」タブからお店を登録してください。</p>
        ) : (
          <>
            <label className="field">
              お店
              <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}({genreOf(r.genreId).label})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              日付
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <p className="setting-name">満足度</p>
            <div className="stars-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={n <= rating ? 'star on' : 'star'}
                  aria-label={`星${n}`}
                  onClick={() => setRating(n)}
                >
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <label className="field">
              ひとことメモ
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="スープが神がかっていた"
              />
            </label>
            <div className="form-actions">
              <button className="btn ghost" onClick={onClose}>
                キャンセル
              </button>
              <button
                className="btn primary"
                disabled={restaurantId === '' || rating === 0 || date === ''}
                onClick={() =>
                  onSave({
                    restaurantId,
                    date,
                    rating: rating as Visit['rating'],
                    note: note.trim() !== '' ? note.trim() : undefined,
                  })
                }
              >
                発券する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
