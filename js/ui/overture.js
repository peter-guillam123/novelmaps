// The overture: choose Story and, before anything moves, the camera
// pulls out to the whole canvas of the novel while a panel gives the
// sweep of the thing and introduces the cast in the map's own language
// — their colours and letters. Then Start.

import { CHARACTER_COLOURS } from '../constants.js';
import { characterInitial } from './format.js';

export function createOverture(container, map, novel, paths, { onStart, reducedMotion }) {
  // The full story extent: every densified route vertex, so the frame
  // includes the sea lanes, not just the pins.
  const bounds = [];
  for (const { path } of paths) {
    for (const [lng, lat] of path.coords) {
      if (!bounds.length) bounds.push([lng, lat], [lng, lat]);
      else {
        bounds[0][0] = Math.min(bounds[0][0], lng);
        bounds[0][1] = Math.min(bounds[0][1], lat);
        bounds[1][0] = Math.max(bounds[1][0], lng);
        bounds[1][1] = Math.max(bounds[1][1], lat);
      }
    }
  }

  let open = false;

  function show() {
    if (open || !novel.overture) return false;
    open = true;

    container.innerHTML = `
      <div class="overture-panel" role="dialog" aria-labelledby="overture-text">
        <p class="overture-text" id="overture-text"></p>
        <ul class="overture-cast" role="list"></ul>
        <button type="button" class="overture-start">Start the journey</button>
      </div>`;
    container.querySelector('.overture-text').textContent = novel.overture;

    const cast = container.querySelector('.overture-cast');
    for (const c of novel.characters) {
      const li = document.createElement('li');
      li.className = 'overture-chip';
      li.title = c.role;
      li.innerHTML = `<span class="overture-disc"></span><span class="overture-name"></span>`;
      const disc = li.querySelector('.overture-disc');
      disc.style.background = CHARACTER_COLOURS[c.colour];
      disc.textContent = characterInitial(c.name);
      li.querySelector('.overture-name').textContent = c.name;
      cast.append(li);
    }

    document.body.classList.add('is-overture');

    const cam = map.cameraForBounds(bounds, {
      padding: { top: 80, bottom: 250, left: 60, right: 60 },
    });
    if (cam) {
      if (reducedMotion()) map.jumpTo({ center: cam.center, zoom: cam.zoom });
      else map.easeTo({ center: cam.center, zoom: cam.zoom, duration: 1600 });
    }

    const start = container.querySelector('.overture-start');
    start.addEventListener('click', () => {
      hide();
      onStart();
    });
    document.addEventListener('keydown', onKey);
    start.focus({ preventScroll: true });
    return true;
  }

  function onKey(e) {
    if (e.key === 'Escape' && open) {
      hide();
      onStart({ play: false }); // reveal the controls without playing
    }
  }

  function hide() {
    open = false;
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('is-overture');
    container.classList.add('is-leaving');
    setTimeout(() => {
      container.innerHTML = '';
      container.classList.remove('is-leaving');
    }, 400);
  }

  return { show, isOpen: () => open };
}
