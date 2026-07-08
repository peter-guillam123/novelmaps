// Author-time helper — NOT shipped, not part of playback.
//
// Traces a river's real course between two points and emits a chain of
// [lng, lat] via-points that hug the water, so a `ship`/`medium: river` leg
// follows the meanders instead of cutting a straight line across the land.
// Bake the output into the novel's `via`; the runtime stays dumb.
//
//   node tools/river-trace.mjs "<River[,River2…]>" <lng,lat> <lng,lat> [--eps KM]
//   e.g. node tools/river-trace.mjs "Congo,Lualaba" 15.30,-4.30 25.191,0.515
//
// It loads Natural Earth's public-domain river centrelines (named rivers,
// vendored in ./data/), builds a graph of the requested river's segments —
// its parts share endpoints, so they stitch automatically, with a small
// tolerance to bridge any gap — snaps each endpoint to the nearest river
// vertex, walks the shortest path along the water (Dijkstra), and simplifies
// the result (Douglas–Peucker, --eps km) so straight runs collapse and bends
// survive. Caveat: the centreline is generalised at map scale — it follows
// the river convincingly but not every oxbow.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const riversPath = fileURLToPath(new URL('./data/ne_10m_rivers_named.geojson', import.meta.url));
const RIVERS = JSON.parse(readFileSync(riversPath, 'utf8'));

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---- args ----
const [, , riverArg, aArg, bArg, ...rest] = process.argv;
if (!riverArg || !aArg || !bArg) {
  console.error('usage: node tools/river-trace.mjs "<River[,River2…]>" <lng,lat> <lng,lat> [--eps KM]');
  process.exit(2);
}
const names = new Set(riverArg.split(',').map((s) => s.trim()));
const A = aArg.split(',').map(Number);
const B = bArg.split(',').map(Number);
const epsIdx = rest.indexOf('--eps');
const EPS_KM = epsIdx >= 0 ? Number(rest[epsIdx + 1]) : 1.5;

// ---- gather the requested river's line parts ----
const parts = [];
for (const f of RIVERS.features) {
  if (!names.has(f.properties.name)) continue;
  const g = f.geometry;
  const segs = g.type === 'MultiLineString' ? g.coordinates : [g.coordinates];
  for (const s of segs) parts.push(s);
}
if (!parts.length) {
  console.error(`no river parts found for "${[...names].join(', ')}" — check the name against the dataset`);
  process.exit(1);
}

// ---- build an undirected graph; exact coords auto-merge at shared junctions ----
const key = (c) => `${c[0]},${c[1]}`;
const nodes = new Map(); // key -> [lng,lat]
const adj = new Map();   // key -> Map(key -> km)
function node(c) {
  const k = key(c);
  if (!nodes.has(k)) { nodes.set(k, c); adj.set(k, new Map()); }
  return k;
}
function edge(c1, c2) {
  const k1 = node(c1), k2 = node(c2);
  if (k1 === k2) return;
  const d = haversine(c1, c2);
  const m1 = adj.get(k1), m2 = adj.get(k2);
  if (!(m1.get(k2) <= d)) m1.set(k2, d);
  if (!(m2.get(k1) <= d)) m2.set(k1, d);
}
for (const part of parts) {
  for (let i = 0; i + 1 < part.length; i++) edge(part[i], part[i + 1]);
}

// Bridge any small gap between separate parts — connect each part's ENDPOINTS
// (not interior nodes, so a meander that loops near itself is never shortcut)
// to the nearest node within tolerance.
const BRIDGE_KM = 3;
const allNodes = [...nodes.values()];
for (const part of parts) {
  for (const end of [part[0], part[part.length - 1]]) {
    let best = null, bestD = Infinity;
    for (const c of allNodes) {
      if (c === end) continue;
      const d = haversine(end, c);
      if (d > 0 && d < bestD) { bestD = d; best = c; }
    }
    if (best && bestD <= BRIDGE_KM) edge(end, best);
  }
}

function nearest(pt) {
  let best = null, bestD = Infinity;
  for (const c of nodes.values()) {
    const d = haversine(pt, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { node: best, km: bestD };
}

// ---- Dijkstra along the water ----
function shortestPath(startPt, endPt) {
  const s = nearest(startPt), e = nearest(endPt);
  const src = key(s.node), dst = key(e.node);
  const dist = new Map(), prev = new Map(), done = new Set();
  for (const k of nodes.keys()) dist.set(k, Infinity);
  dist.set(src, 0);
  // simple O(n^2) selection — the graphs are small (< a few thousand nodes)
  while (true) {
    let u = null, ud = Infinity;
    for (const [k, d] of dist) if (!done.has(k) && d < ud) { ud = d; u = k; }
    if (u === null || u === dst) break;
    done.add(u);
    for (const [v, w] of adj.get(u)) {
      if (done.has(v)) continue;
      const nd = ud + w;
      if (nd < dist.get(v)) { dist.set(v, nd); prev.set(v, u); }
    }
  }
  if (!prev.has(dst) && src !== dst) return null;
  const path = [];
  let cur = dst;
  while (cur !== undefined) { path.unshift(nodes.get(cur)); cur = prev.get(cur); }
  return { path, snapStartKm: s.km, snapEndKm: e.km, km: dist.get(dst) };
}

// ---- Douglas–Peucker simplify (epsilon in km, planar approx at this scale) ----
function perpKm(p, a, b) {
  const latm = 111.32, lngm = 111.32 * Math.cos(rad((a[1] + b[1]) / 2));
  const ax = a[0] * lngm, ay = a[1] * latm;
  const bx = b[0] * lngm, by = b[1] * latm;
  const px = p[0] * lngm, py = p[1] * latm;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let idx = -1, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpKm(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps) {
    const left = simplify(pts.slice(0, idx + 1), eps);
    const right = simplify(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

// ---- run ----
const res = shortestPath(A, B);
if (!res) {
  console.error('no path along the water between those points — are both near the same river system?');
  process.exit(1);
}
const round = (c) => [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4];
let line = res.path.map(round);
// drop the snapped river endpoints if they sit right on A/B already; keep interior shaping
const simplified = simplify(line, EPS_KM);

console.error(`river: ${[...names].join(', ')}`);
console.error(`snapped start ${res.snapStartKm.toFixed(1)}km, end ${res.snapEndKm.toFixed(1)}km to the centreline`);
console.error(`along-water distance ${res.km.toFixed(0)}km; ${res.path.length} vertices -> ${simplified.length} after simplify (eps ${EPS_KM}km)`);
console.error('via (paste-ready):');
// print the coordinate array to stdout, one point per line for a readable diff
console.log('[');
console.log(simplified.map((c) => `        [${c[0]}, ${c[1]}]`).join(',\n'));
console.log(']');
