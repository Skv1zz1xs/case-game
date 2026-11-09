import { useEffect, useState } from 'react';
import { caseById } from '../data/cases';
import { FREE_CASE } from '../data/free';
import { game, useProfile, useToasts } from './game';
import { CasesPage } from './pages/CasesPage';
import { CasePage } from './pages/CasePage';
import { BonusPage } from './pages/BonusPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { BattlesPage } from './pages/BattlesPage';
import { UpgradePage } from './pages/UpgradePage';
import { ContractPage } from './pages/ContractPage';
import { SettingsModal } from './components/SettingsModal';
import { useNow } from './components/Countdown';
import { Sidebar } from './components/Sidebar';
import { AnimatedNumber } from './components/Balance';
import { tickPlay } from '../core/rewards';

type Tab = 'inv' | 'cases' | 'battles' | 'upgrade' | 'bonus' | 'profile';
const TABS: { id: Tab; ic: string; name: string; mob?: boolean }[] = [
  { id: 'inv', ic: '🎒', name: 'Инвентарь' },
  { id: 'cases', ic: '📦', name: 'Кейсы', mob: true },
  { id: 'battles', ic: '⚔️', name: 'Батлы', mob: true },
  { id: 'upgrade', ic: '⬆️', name: 'Апгрейды', mob: true },
  { id: 'bonus', ic: '🎁', name: 'Награды', mob: true },
];

// Простой роутинг через hash: #/cases, #/case/<id>, #/upgrade, #/contract …
function parse(): { tab: Tab; caseId?: string; sub?: string } {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'case' && h[1]) return { tab: 'cases', caseId: h[1] };
  if (h[0] === 'contract') return { tab: 'upgrade', sub: 'contract' };
  if (h[0] === 'battle' && h[1]) return { tab: 'battles', sub: h[1] };
  if (h[0] === 'games') return { tab: 'upgrade' };
  if (TABS.some((t) => t.id === h[0]) || h[0] === 'profile') return { tab: h[0] as Tab };
  return { tab: 'cases' };
}

export function App() {
  const p = useProfile();
  const toasts = useToasts();
  const now = useNow(1000);
  const [route, setRoute] = useState(parse());
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const f = () => { setRoute(parse()); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  const go = (path: string) => { location.hash = '/' + path; };
  // время в игре считается, только пока вкладка открыта и видна
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && game.p.nick) { tickPlay(game, 15); game.commit(); }
    }, 15000);
    return () => clearInterval(t);
  }, []);

  if (!p.nick) return <NickScreen />;

  const freeReady = now >= p.freeAt;
  const dailyReady = !game.dailyState().claimed;
  const c = route.caseId ? (route.caseId === 'free' ? FREE_CASE : caseById(route.caseId)) : undefined;
  const invValue = p.inventory.reduce((s, i) => s + i.price, 0);

  return (
    <div className="app">
      <div className="backdrop" aria-hidden style={{ ['--bg-img' as any]: `url(${(import.meta as any).env?.BASE_URL ?? './'}bg.webp)` }} />
      <header className="head">
        <button className="logo" onClick={() => go('cases')}><span className="logo-ic">🎰</span><span className="full"><b>КЕЙС</b>-РОЯЛЬ</span></button>
        <div className="head-quick">
          <button className="qbtn" title="Бесплатный кейс" onClick={() => go('case/free')}>🎉{freeReady && <i className="qdot" />}</button>
          <button className="qbtn" title="Ежедневная награда" onClick={() => go('bonus')}>📅{dailyReady && <i className="qdot" />}</button>
        </div>
        <nav className="topnav">
          {TABS.map((t) => <button key={t.id} className={route.tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>{t.name}</button>)}
        </nav>
        <div className="spacer" />
        <div className="head-icons">
          <button className={`qbtn${route.sub === 'contract' ? ' on' : ''}`} title="Контракты" onClick={() => go('contract')}>📜</button>
        </div>
        <AnimatedNumber className="bal inv" title="Стоимость инвентаря" onClick={() => go('inv')} icon={<span className="bal-ic">🔫</span>} value={invValue} />
        <AnimatedNumber className="bal" title="Баланс" onClick={() => go('bonus')} icon={<i className="coin" />} value={p.balance} />
        <button className="plus" title="Бесплатные монеты" onClick={() => go('bonus')}>＋</button>
        <button className="avatar" title="Профиль" onClick={() => go('profile')}>{(p.nick || '?')[0].toUpperCase()}</button>
      </header>

      <div className="layout">
        <Sidebar go={go} />
        <main className="main">
          {c ? <CasePage key={c.id} c={c} free={c.id === 'free'} onBack={() => go('cases')} />
            : route.tab === 'cases' ? <CasesPage onOpen={(id) => go('case/' + id)} onBonus={() => go('bonus')} />
            : route.tab === 'bonus' ? <BonusPage onFree={() => go('case/free')} />
            : route.sub === 'contract' ? <ContractPage onBack={() => go('upgrade')} />
            : route.tab === 'upgrade' ? <UpgradePage onBack={() => go('cases')} onContract={() => go('contract')} />
            : route.tab === 'battles' ? <BattlesPage go={go} openId={route.sub} />
            : route.tab === 'inv' ? <InventoryPage />
            : <ProfilePage onSettings={() => setSettings(true)} />}
        </main>
      </div>

      <nav className="botnav">
        {TABS.filter((t) => t.mob).map((t) => (
          <button key={t.id} className={route.tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
            <span className="ic">{t.ic}</span>{t.name}
            {t.id === 'bonus' && (freeReady || dailyReady) && <span className="dot" />}
          </button>
        ))}
        <button className={route.tab === 'profile' || route.tab === 'inv' ? 'on' : ''} onClick={() => go('profile')}>
          <span className="ic">👤</span>Профиль
        </button>
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
