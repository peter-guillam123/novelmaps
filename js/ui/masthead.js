// The masthead: project name, novel title, author, mode tabs — and the
// visible way back to the shelf.

export function createMasthead(container, index, activeId, { onMode } = {}) {
  const novelMeta = index.find((n) => n.id === activeId);
  container.innerHTML = `
    <p class="masthead-kicker">PlotLines</p>
    <h1 class="masthead-title"></h1>
    <p class="masthead-byline"></p>
    <div class="mode-tabs" role="group" aria-label="Mode">
      <button type="button" data-mode="story" aria-pressed="true">Story</button>
      <button type="button" data-mode="explore" aria-pressed="false">Explore</button>
    </div>
    <nav class="masthead-links" aria-label="PlotLines">
      <a class="masthead-link masthead-library" href="./">&#8617; Library</a>
      <a class="masthead-link" href="about.html">About</a>
    </nav>`;
  container.querySelector('.masthead-title').textContent = novelMeta.title;
  container.querySelector('.masthead-byline').textContent =
    `${novelMeta.author}, ${novelMeta.year}`;

  const tabs = [...container.querySelectorAll('.mode-tabs button')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => onMode && onMode(tab.dataset.mode));
  }
  function setMode(mode) {
    for (const tab of tabs) {
      tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode));
    }
  }

  return { setMode };
}
