import type { AppData } from '../lib/types';
import { formatDateJP, stars } from '../lib/format';

interface Props {
  data: AppData;
  today: string;
  onDelete: (visitId: string) => void;
  onOpenRecord: () => void;
}

export default function HistoryView({ data, today, onDelete, onOpenRecord }: Props) {
  const byId = new Map(data.restaurants.map((r) => [r.id, r]));
  const dates = [...new Set(data.visits.map((v) => v.date))].sort((a, b) =>
    a < b ? 1 : -1,
  );

  return (
    <section className="view">
      <button className="btn primary wide" onClick={onOpenRecord}>
        + 食券を切る(ランチを記録)
      </button>

      {data.visits.length === 0 ? (
        <div className="card empty">
          <p className="muted">まだ発券がありません。食べたら★を付けていきましょう。</p>
        </div>
      ) : (
        dates.map((date) => (
          <div key={date} className="date-group">
            <h3 className="date-head">{formatDateJP(date, today)}</h3>
            {data.visits
              .filter((v) => v.date === date)
              .map((v) => {
                const r = byId.get(v.restaurantId);
                return (
                  <div key={v.id} className="ticket">
                    <div className="ticket-body">
                      <span className="vname">{r ? r.name : '(削除された店)'}</span>
                      <span className="vstars" aria-label={`星${v.rating}`}>
                        {stars(v.rating)}
                      </span>
                      {v.note && <p className="vnote muted">{v.note}</p>}
                    </div>
                    <button
                      className="icon-btn"
                      aria-label="この記録を削除"
                      onClick={() => {
                        if (confirm('この記録を削除しますか?')) onDelete(v.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        ))
      )}
    </section>
  );
}
