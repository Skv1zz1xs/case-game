// Хаб режимов
const MODES = [
  { id: 'upgrade', ic: '⬆️', name: 'Апгрейдер', text: 'Ставь предметы и монеты, выбирай цель, крути колесо.' },
  { id: 'contract', ic: '📜', name: 'Контракты', text: '10 предметов одной редкости → 1 предмет редкости выше. Есть секретные рецепты.' },
  { id: '', ic: '⚔️', name: 'Батлы', text: 'Открывайте кейсы одновременно с друзьями — кто вытащил больше, забирает всё.', soon: 'Этап 4' },
  { id: '', ic: '🏅', name: 'Батл-пасс', text: '60 уровней, задания и эксклюзивы сезона.', soon: 'Этап 5' },
];

export function GamesPage({ go }: { go: (path: string) => void }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Режимы</h1>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {MODES.map((m) => (
          <button key={m.name} className="glass mode-card" disabled={!m.id} style={{ opacity: m.id ? 1 : 0.6 }} onClick={() => m.id && go(m.id)}>
            <div className="row"><div style={{ fontSize: 34 }}>{m.ic}</div><h2 className="grow" style={{ fontSize: 17 }}>{m.name}</h2>{m.soon && <span className="badge" style={{ position: 'static' }}>{m.soon}</span>}</div>
            <p className="muted small" style={{ marginBottom: 0 }}>{m.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
