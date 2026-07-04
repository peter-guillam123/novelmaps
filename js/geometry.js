// Pure geometry: great-circle arcs, densification, arc-length lookup.
// All coordinates are [lng, lat]. No map, no DOM.

const R = 6371; // km

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export function haversineKm(a, b) {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Spherical linear interpolation between two [lng, lat] points.
function slerp(a, b, t) {
  const [lng1, lat1] = [rad(a[0]), rad(a[1])];
  const [lng2, lat2] = [rad(b[0]), rad(b[1])];

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
      )
    );
  if (d < 1e-9) return [a[0], a[1]];

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.sqrt(x * x + y * y)))];
}

// Densify one segment as a great-circle arc: one vertex per ~25 km,
// at least 8, so short hops stay smooth and long hauls stay light.
function densifySegment(a, b) {
  const n = Math.max(8, Math.ceil(haversineKm(a, b) / 25));
  const pts = [];
  for (let i = 1; i <= n; i++) pts.push(slerp(a, b, i / n));
  return pts;
}

// A movement's full path: from -> via... -> to, densified, with a
// cumulative-distance table for arc-length-true interpolation.
export function buildPath(fromCoords, viaCoords, toCoords) {
  const anchors = [fromCoords, ...(viaCoords || []), toCoords];
  const coords = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    coords.push(...densifySegment(anchors[i - 1], anchors[i]));
  }
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineKm(coords[i - 1], coords[i]));
  }
  return { coords, cum, totalKm: cum[cum.length - 1] };
}

// Position at fraction t (0..1) of a path, constant speed by distance.
// O(log n) binary search over the cumulative table.
export function positionAt(path, t) {
  const { coords, cum, totalKm } = path;
  if (t <= 0 || totalKm === 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];
  const target = t * totalKm;

  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const span = cum[i] - cum[i - 1];
  const f = span === 0 ? 0 : (target - cum[i - 1]) / span;
  const a = coords[i - 1];
  const b = coords[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
