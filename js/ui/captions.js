// The narration strip: announces each movement as it begins. The
// container carries aria-live="polite", so this is simultaneously the
// screen-reader narration and part of the page's charm.

import { movementSentence } from './format.js';

export function createCaptions(container, novel, timeline) {
  let hideTimer = null;

  timeline.on('movementStarted', (movement, character) => {
    const sentence = movementSentence(novel, movement, character);
    container.innerHTML = '';
    const line = document.createElement('p');
    line.className = 'caption-line';
    line.textContent = sentence;
    if (movement.note) {
      const note = document.createElement('span');
      note.className = 'caption-note';
      note.textContent = ` ${movement.note}.`;
      line.append(note);
    }
    container.append(line);
    container.classList.add('is-visible');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => container.classList.remove('is-visible'), 6500);
  });

  // Scrubbing far afield makes stale narration misleading — clear it.
  timeline.on('chapterChanged', () => {
    if (!timeline.state.playing) {
      container.classList.remove('is-visible');
    }
  });
}
