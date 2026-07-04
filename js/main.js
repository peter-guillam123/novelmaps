import { createMap } from './map.js';

const map = createMap('map');

map.on('error', (e) => {
  // Tile/style errors are surfaced per-source elsewhere; log once here
  // so a broken deploy is visible in the console without spamming.
  if (e && e.error) console.warn('map:', e.error.message || e.error);
});
