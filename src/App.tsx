import { useEffect, useState } from 'react';
import type { AppData, Restaurant, Settings, Visit } from './lib/types';
import { todayISO } from './lib/bandit';
import { emptyData, loadData, saveData } from './lib/storage';
import { buildSampleData } from './lib/sample';
import RecommendView from './components/RecommendView';
import HistoryView from './components/HistoryView';
import StoresView from './components/StoresView';
import SettingsView from './components/SettingsView';
import RecordSheet from './components/RecordSheet';

type Tab = 'today' | 'log' | 'stores' | 'settings';

const TABS: Array<{ id: Tab; emoji: string; label: string }> = [
  { id: 'today', emoji: '🎰', label: 'きょう' },
  { id: 'log', emoji: '📝', label: 'きろく' },
  { id: 'stores', emoji: '🏪', label: 'おみせ' },
  { id: 'settings', emoji: '⚙️', label: 'せってい' },
];

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<{ restaurantId?: string } | null>(null);
  const today = todayISO();

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addVisit = (v: Omit<Visit, 'id'>) => {
    setData((d) => ({
      ...d,
      visits: [...d.visits, { ...v, id: crypto.randomUUID() }],
    }));
  };

  const deleteVisit = (id: string) => {
    setData((d) => ({ ...d, visits: d.visits.filter((v) => v.id !== id) }));
  };

  const addRestaurant = (r: Omit<Restaurant, 'id' | 'archived' | 'createdAt'>) => {
    setData((d) => ({
      ...d,
      restaurants: [
        ...d.restaurants,
        { ...r, id: crypto.randomUUID(), archived: false, createdAt: today },
      ],
    }));
  };

  const toggleArchive = (id: string) => {
    setData((d) => ({
      ...d,
      restaurants: d.restaurants.map((r) =>
        r.id === id ? { ...r, archived: !r.archived } : r,
      ),
    }));
  };

  const deleteRestaurant = (id: string) => {
    setData((d) => ({
      ...d,
      restaurants: d.restaurants.filter((r) => r.id !== id),
      visits: d.visits.filter((v) => v.restaurantId !== id),
    }));
  };

  const setSettings = (settings: Settings) => setData((d) => ({ ...d, settings }));

  const loadSample = () =>
    setData((d) => ({ ...buildSampleData(today), settings: d.settings }));

  return (
    <div className="app">
      <header className="app-head">
        <h1>🎰 ランチバンディット</h1>
        <p className="tagline">きょうのランチ、探索か活用か。</p>
      </header>

      {tab === 'today' && (
        <RecommendView
          data={data}
          today={today}
          onPick={(id) => setSheet({ restaurantId: id })}
          onLoadSample={loadSample}
        />
      )}
      {tab === 'log' && (
        <HistoryView
          data={data}
          today={today}
          onDelete={deleteVisit}
          onOpenRecord={() => setSheet({})}
        />
      )}
      {tab === 'stores' && (
        <StoresView
          data={data}
          onAdd={addRestaurant}
          onToggleArchive={toggleArchive}
          onDelete={deleteRestaurant}
        />
      )}
      {tab === 'settings' && (
        <SettingsView
          data={data}
          today={today}
          onSettings={setSettings}
          onReplace={setData}
          onLoadSample={loadSample}
          onClear={() => setData(emptyData())}
        />
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-emoji">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {sheet !== null && (
        <RecordSheet
          restaurants={data.restaurants.filter((r) => !r.archived)}
          defaultRestaurantId={sheet.restaurantId}
          today={today}
          onSave={(v) => {
            addVisit(v);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
