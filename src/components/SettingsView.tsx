import { useRef } from 'react';
import type { AppData, ExploreLevel, MemoryLevel, Settings } from '../lib/types';
import { exportJSON, parseImport } from '../lib/storage';

interface Props {
  data: AppData;
  today: string;
  onSettings: (s: Settings) => void;
  onReplace: (d: AppData) => void;
  onLoadSample: () => void;
  onClear: () => void;
}

const EXPLORE_OPTS: Array<{ v: ExploreLevel; label: string; hint: string }> = [
  { v: 'low', label: '控えめ', hint: 'いつもの店を中心に(c = 0.2)' },
  { v: 'mid', label: 'ふつう', hint: 'バランスよく(c = 0.4)' },
  { v: 'high', label: '冒険', hint: '新しい店をどんどん(c = 0.7)' },
];

const MEMORY_OPTS: Array<{ v: MemoryLevel; label: string; hint: string }> = [
  { v: 'forever', label: '忘れない', hint: '全履歴を等しく信じる' },
  { v: 'slow', label: 'ゆっくり', hint: '約2年で記憶が半減' },
  { v: 'normal', label: 'ふつう', hint: '約4.5ヶ月で記憶が半減' },
  { v: 'fast', label: '移り気', hint: '約2ヶ月で記憶が半減' },
];

export default function SettingsView({
  data,
  today,
  onSettings,
  onReplace,
  onLoadSample,
  onClear,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportJSON(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunch-bandit-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const next = parseImport(await file.text());
      if (
        confirm(
          `お店${next.restaurants.length}件・記録${next.visits.length}件を読み込みます。現在のデータは置き換えられます。よろしいですか?`,
        )
      ) {
        onReplace(next);
      }
    } catch (err) {
      alert(`読み込めませんでした:${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <section className="view">
      <h2 className="section-title">アルゴリズム</h2>
      <div className="card">
        <p className="setting-name">探索ぐあい</p>
        <div className="seg-control">
          {EXPLORE_OPTS.map((o) => (
            <button
              key={o.v}
              className={data.settings.explore === o.v ? 'seg-btn on' : 'seg-btn'}
              onClick={() => onSettings({ ...data.settings, explore: o.v })}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="hint muted">
          {EXPLORE_OPTS.find((o) => o.v === data.settings.explore)?.hint}
        </p>

        <p className="setting-name">味の記憶</p>
        <div className="seg-control">
          {MEMORY_OPTS.map((o) => (
            <button
              key={o.v}
              className={data.settings.memory === o.v ? 'seg-btn on' : 'seg-btn'}
              onClick={() => onSettings({ ...data.settings, memory: o.v })}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="hint muted">
          {MEMORY_OPTS.find((o) => o.v === data.settings.memory)?.hint}
          。昔の評価ほど軽くなり、ご無沙汰の店に探索ボーナスが戻ります。
        </p>
      </div>

      <h2 className="section-title">データ</h2>
      <div className="card data-actions">
        <button className="btn ghost" onClick={download}>
          エクスポート(JSON)
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>
          インポート
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
        <button
          className="btn ghost"
          onClick={() => {
            if (confirm('見本メニューで置き換えますか?現在のデータは消えます')) {
              onLoadSample();
            }
          }}
        >
          見本メニューで置き換え
        </button>
        <button
          className="btn ghost danger"
          onClick={() => {
            if (confirm('すべてのデータを削除しますか?この操作は戻せません')) {
              onClear();
            }
          }}
        >
          全データ削除
        </button>
      </div>

      <h2 className="section-title">しくみ</h2>
      <div className="card nerd">
        <p>
          中身は<b>割引UCB</b>です。★評価を[0,1]に正規化して、
        </p>
        <p className="formula">score = μ̂ + c · √( ln N / n )</p>
        <p className="muted">
          μ̂:その店の減衰込み平均評価/n:有効訪問回数/N:全体の総訪問回数/c:探索ぐあい。
          行っていない店ほど n が小さく√の中が大きくなるので、「そろそろ試そうよ」と上位に浮上してきます。
        </p>
      </div>
    </section>
  );
}
