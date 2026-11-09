// Отклик на действия (по навыку game-feel): короткий, по важности, всегда возвращается в покой.
// Всплывающие числа «+X», вспышка баланса.

export function floatText(text: string, x: number, y: number, color = '#2fd47a') {
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = text;
  el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

// Всплыть над элементом, по которому кликнули
export function floatFrom(el: Element | null, text: string, color?: string) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  floatText(text, r.left + r.width / 2, r.top, color);
}
