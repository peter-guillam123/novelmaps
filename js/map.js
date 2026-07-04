// MapLibre setup: base style, controls, attribution.
// The NLS historic overlay, route and marker layers are added by their
// own modules once the map and data are ready.

import { STYLE_URL } from './constants.js';

// Base-layer attribution comes from the style's own sources (OpenFreeMap /
// OSM / OpenMapTiles); the NLS overlay adds its own when enabled.

// Dracula's whole canvas, roughly: Ireland to Transylvania.
const DEFAULT_BOUNDS = [[-11, 42], [30, 60]];

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    bounds: DEFAULT_BOUNDS,
    fitBoundsOptions: { padding: 40 },
    attributionControl: { compact: false },
    // Keep pinch/scroll behaviour sane inside a full-bleed page
    cooperativeGestures: false,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.keyboard.enable();

  return map;
}
