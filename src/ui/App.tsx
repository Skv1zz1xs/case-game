import { useEffect, useState } from 'react';
import { caseById } from '../data/cases';
import { FREE_CASE } from '../data/free';
import { game, useProfile, useToasts, fmt } from './game';
import { CasesPage } from './pages/CasesPage';
import { CasePage } from './pages/CasePage';
import { BonusPage } from './pages/BonusPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { GamesPage } from './pages/GamesPage';
import { SettingsModal } from './components/SettingsModal';
import { useNow } from './components/Countdown';

type Tab = 'cases' | 'bonus' | 'games' | 'inv' | 'profile';
const TABS: { id: Tab; ic: string; name: string }[] = [
  { id: 'cases', ic: '📦', name: 'Кейсы' },
  { id: 'bonus', ic: '🎁', name: 'Бонусы' },
  { id: 'games', ic: '🎮', name: 'Режимы' },
  { id: 'inv', ic: '🎒', name: 'Инвентарь' },
  { id: 'profile', ic: '👤', name: 'Профиль' },
];

// Простой роутинг через hash: #/cases, #/case/<id>, #/bonus …
function parse(): { tab: Tab; caseId?: string } {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'case' && h[1]) return { tab: 'cases', caseId: h[1] };
  if (TABS.some((t) => t.id === h[0])) return { tab: h[0] as Tab };
  return { tab: 'cases' };
}

export function App() {
  const p = useProfile();
  const toasts = useToasts();
  const now = useNow(1000);
  const [route, setRoute] = useState(parse());
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const f = () => setRoute(parse());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  const go = (path: string) => { location.hash = '/' + path; };

  if (!p.nick) return <NickScreen />;

  const freeReady = now >= p.freeAt;
  const dailyReady = !game.dailyState().claimed;
  const c = route.caseId ? (route.caseId === 'free' ? FREE_CASE : caseById(route.caseId)) : undefined;

  return (
    <div className="app">
      <header className="head">
        <button className="logo" onClick={() => go('cases')}><span>🎰</span><span className="full"><b>Кейс</b>-Рояль</span></button>
        <nav className="topnav">
          {TABS.map((t) => <button key={t.id} className={route.tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.name}</button>)}
        </nav>
        <div className="spacer" />
        <div className="balance" title="Баланс"><i className="coin" />{fmt(p.balance)}</div>
        <button className="iconbtn" onClick={() => setSettings(true)} aria-label="Настройки">⚙️</button>
      </header>

      <main className="main">
        {c ? <CasePage key={c.id} c={c} free={c.id === 'free'} onBack={() => go('cases')} />
          : route.tab === 'cases' ? <CasesPage onOpen={(id) => go('case/' + id)} onBonus={() => go('bonus')} />
          : route.tab === 'bonus' ? <BonusPage onFree={() => go('case/free')} />
          : route.tab === 'games' ? <GamesPage />
          : route.tab === 'inv' ? <InventoryPage />
          : <ProfilePage onSettings={() => setSettings(true)} />}
      </main>

      <nav className="botnav">
        {TABS.map((t) => (
          <button key={t.id} className={route.tab === t.id && !(c && t.id !== 'cases') ? 'on' : ''} onClick={() => go(t.id)}>
            <span className="ic">{t.ic}</span>{t.name}
            {t.id === 'bonus' && (freeReady || dailyReady) && <span className="dot" />}
          </button>
        ))}
      </nav>

      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      <div className="toast-stack">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind ?? ''}`}>{t.text}</div>)}</div>
    </div>
  );
}

function NickScreen() {
  const [n, setN] = useState('');
  const ok = n.trim().length >= 2;
  return (
    <div className="overlay" style={{ background: 'transparent', backdropFilter: 'none' }}>
      <form className="modal" style={{ maxWidth: 420, textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); if (ok) game.setNick(n.trim()); }}>
        <div style={{ fontSize: 56 }}>🎰</div>
        <h1 style={{ fontSize: 26, margin: '8px 0' }}>Кейс-Рояль</h1>
        <p className="muted">Открывай кейсы, апгрейдь, собирай контракты и рви друзей в батлах. Всё на виртуальные монеты.</p>
        <input className="input" autoFocus maxLength={16} placeholder="Твой ник" value={n} onChange={(e) => setN(e.target.value)} style={{ margin: '10px 0 12px', textAlign: 'center', fontSize: 18 }} />
        <button className="btn primary lg" style={{ width: '100%' }} disabled={!ok}>Играть</button>
      </form>
    </div>
  );
}
