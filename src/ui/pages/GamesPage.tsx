// Хаб режимов. Апгрейдер, контракты и батлы появятся на следующих этапах.
const MODES = [
  { ic: '⬆️', name: 'Апгрейдер', text: 'Ставь предметы и монеты, выбирай цель, крути колесо.', soon: 'Этап 2' },
  { ic: '📜', name: 'Контракты', text: '10 предметов одной редкости → 1 предмет редкости выше. Есть секретные рецепты.', soon: 'Этап 2' },
  { ic: '⚔️', name: 'Батлы', text: 'Открывайте кейсы одновременно с друзьями — кто вытащил больше, забирает всё.', soon: 'Этап 4' },
  { ic: '🏅', name: 'Батл-пасс', text: '60 уровней, задания и эксклюзивы сезона.', soon: 'Этап 5' },
];

export function GamesPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Режимы</h1>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {MODES.map((m) => (
          <div key={m.name} className="glass" style={{ padding: 18, opacity: 0.85 }}>
            <div className="row"><div style={{ fontSize: 34 }}>{m.ic}</div><h2 className="grow" style={{ fontSize: 17 }}>{m.name}</h2><span className="badge" style={{ position: 'static' }}>{m.soon}</span></div>
            <p className="muted small" style={{ marginBottom: 0 }}>{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
