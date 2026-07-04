// The masthead: project name, novel title, author. With one novel it is
// a title plate; with several it becomes a picker (the code path exists,
// the shelf awaits more books).

export function createMasthead(container, index, activeId, onPick) {
  const novelMeta = index.find((n) => n.id === activeId);
  container.innerHTML = `
    <p class="masthead-kicker">Novelmaps</p>
    <h1 class="masthead-title"></h1>
    <p class="masthead-byline"></p>
    <a class="masthead-about" href="about.html">About</a>`;
  container.querySelector('.masthead-title').textContent = novelMeta.title;
  container.querySelector('.masthead-byline').textContent =
    `${novelMeta.author}, ${novelMeta.year}`;

  if (index.length > 1) {
    const select = document.createElement('select');
    select.className = 'masthead-picker';
    select.setAttribute('aria-label', 'Choose a novel');
    for (const n of index) {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = `${n.title} (${n.author})`;
      opt.selected = n.id === activeId;
      select.append(opt);
    }
    select.addEventListener('change', () => onPick(select.value));
    container.append(select);
  }
}
