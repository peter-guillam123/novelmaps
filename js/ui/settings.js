// The settings cog: a single button in the map's own control style, bottom
// right, that opens a parchment pane. It holds the 1890s-map slider (only
// where the story is on British ground) and the way out of a book — back to
// the shelf, and the two standing pages. The top-left masthead stays clean;
// everything optional lives here.

const COG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3.2"/>
  <path d="M12 2.2v2.4M12 19.4v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.2 12h2.4M19.4 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>
</svg>`;

export function createSettings(map, { overlay } = {}) {
  const hasOverlay = overlay && overlay.available;

  // ---- the pane ----
  const pane = document.createElement('div');
  pane.className = 'settings-pane';
  pane.hidden = true;
  pane.setAttribute('role', 'dialog');
  pane.setAttribute('aria-label', 'Settings');

  const sliderBlock = hasOverlay
    ? `
      <section class="settings-group settings-overlay">
        <h2 class="settings-title">The 1890s map</h2>
        <p class="settings-note">Genuine Ordnance Survey scans, surveyed 1885&ndash;1903,
          laid over Britain. Slide to fade them in and out.</p>
        <input type="range" class="settings-slider" min="0" max="100"
          value="${Math.round(overlay.defaultOpacity * 100)}"
          aria-label="1890s map strength">
        <div class="settings-scale" aria-hidden="true"><span>Off</span><span>Full</span></div>
      </section>`
    : '';

  pane.innerHTML = `
    ${sliderBlock}
    <nav class="settings-links" aria-label="PlotLines">
      <a href="./" class="settings-link">&#8617;&#8194;The library</a>
      <a href="about.html" class="settings-link">How it works</a>
      <a href="workshop.html" class="settings-link">How it&rsquo;s made</a>
    </nav>`;

  if (hasOverlay) {
    const slider = pane.querySelector('.settings-slider');
    const apply = () => {
      const o = slider.valueAsNumber / 100;
      overlay.setVisible(o > 0);
      if (o > 0) overlay.setOpacity(o);
    };
    slider.addEventListener('input', apply);
    // If the tiles fall over mid-session, retire the whole block quietly.
    overlay.onUnavailable(() => pane.querySelector('.settings-overlay')?.remove());
  }

  // ---- the cog ----
  // A MapLibre control *group* for identical chrome (white ground, hairline,
  // shadow, 29px) to the zoom buttons — but placed by hand rather than added
  // to the map's own bottom-right stack, which the transport bar and the
  // attribution already occupy. It sits just above the transport bar.
  const group = document.createElement('div');
  group.className = 'maplibregl-ctrl maplibregl-ctrl-group settings-fab';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'settings-cog';
  btn.setAttribute('aria-label', 'Settings and pages');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = COG;
  group.append(btn);

  map.getContainer().append(group);
  map.getContainer().append(pane);

  function open(show) {
    pane.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
    if (show) pane.querySelector('.settings-slider, .settings-link')?.focus();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    open(pane.hidden);
  });
  // Click away or Escape closes it.
  document.addEventListener('click', (e) => {
    if (!pane.hidden && !pane.contains(e.target) && !group.contains(e.target)) open(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pane.hidden) {
      open(false);
      btn.focus();
    }
  });

  return { open: () => open(true), close: () => open(false) };
}
