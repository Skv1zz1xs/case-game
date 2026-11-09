import { useState } from 'react';
import { game, useProfile, toast } from '../game';
import { newProfile, AnimMode } from '../../core/store';
import { sfx } from '../sound';
import CREDITS from '../../data/modelCredits.json';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const p = useProfile();
  const s = p.settings;
  const [nick, setNick] = useState(p.nick);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 8 }}><h2 className="grow" style={{ fontSize: 19 }}>Настройки</h2><button className="iconbtn" onClick={onClose}>✕</button></div>
        <div className="toggle">
          <div><b>Звук</b><div className="muted small">Тики ленты и звуки дропа</div></div>
          <button className={`switch${s.sound ? ' on' : ''}`} onClick={() => { game.setSettings({ sound: !s.sound }); setTimeout(() => sfx.click(), 0); }} aria-label="Звук" />
        </div>
        {s.sound && (
          <div className="toggle">
            <b>Громкость</b>
            <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => game.setSettings({ volume: Number(e.target.value) })} onPointerUp={() => sfx.tick()} style={{ width: 160 }} />
          </div>
        )}
        <div className="toggle" style={{ flexWrap: 'wrap' }}>
          <div><b>Анимации дропа</b><div className="muted small">Вспышки, конфетти и заставки на крутых предметах</div></div>
          <div className="seg">
            {([['full', 'Полные'], ['short', 'Короткие'], ['off', 'Выкл']] as [AnimMode, string][]).map(([k, n]) => (
              <button key={k} className={s.anim === k ? 'on' : ''} onClick={() => game.setSettings({ anim: k })}>{n}</button>
            ))}
          </div>
        </div>
        <div className="toggle">
          <div><b>Быстрое открытие</b><div className="muted small">Короткая прокрутка ленты</div></div>
          <button className={`switch${s.fast ? ' on' : ''}`} onClick={() => game.setSettings({ fast: !s.fast })} aria-label="Быстро" />
        </div>
        <div className="toggle">
          <input className="input" maxLength={16} value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Ник" />
          <button className="btn sm" disabled={nick.trim().length < 2 || nick === p.nick} onClick={() => { game.setNick(nick.trim()); toast('Ник сохранён', 'good'); }}>Сохранить</button>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary className="small" style={{ cursor: 'pointer', fontWeight: 800 }}>Авторы 3D-моделей</summary>
          <div className="small muted" style={{ lineHeight: 1.6, marginTop: 8 }}>
            Модели оружия с Sketchfab по лицензии CC BY 4.0 (изменены: выровнены, упрощены, поверх — скины игры):
            {Object.values(CREDITS as Record<string, { name: string; author: string; url: string }>).map((c) => (
              <div key={c.url}>«{c.name}» — <a href={c.url} target="_blank" rel="noreferrer">{c.author}</a></div>
            ))}
          </div>
        </details>
        <div style={{ marginTop: 16 }}>
          {!confirm ? <button className="btn danger sm" onClick={() => setConfirm(true)}>Сбросить прогресс</button> : (
            <div className="row"><span className="small grow">Точно? Всё удалится.</span>
              <button className="btn danger sm" onClick={() => { const np = newProfile(p.nick); np.settings = s; game.p = np; game.commit(); setConfirm(false); onClose(); }}>Да, сбросить</button>
              <button className="btn sm" onClick={() => setConfirm(false)}>Нет</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
