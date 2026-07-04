// Character legend: one real <button> per character (≥40px targets),
// click or Enter to follow them, click again to release.

import { CHARACTER_COLOURS } from '../constants.js';

export function createLegend(container, novel, onSelect) {
  container.innerHTML = '';
  const buttons = {};

  for (const c of novel.characters) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'legend-item';
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `
      <span class="legend-swatch" aria-hidden="true"></span>
      <span class="legend-text">
        <span class="legend-name"></span>
        <span class="legend-role"></span>
      </span>`;
    btn.querySelector('.legend-swatch').style.background = CHARACTER_COLOURS[c.colour];
    btn.querySelector('.legend-name').textContent = c.name;
    btn.querySelector('.legend-role').textContent = c.role;
    btn.title = c.role;
    btn.addEventListener('click', () => onSelect(c.id));
    container.append(btn);
    buttons[c.id] = btn;
  }

  return {
    setSelected(id) {
      for (const [cid, btn] of Object.entries(buttons)) {
        btn.setAttribute('aria-pressed', String(cid === id));
      }
      container.classList.toggle('has-selection', Boolean(id));
    },
  };
}
