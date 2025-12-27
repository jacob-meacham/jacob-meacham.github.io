export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function invLerp(a, b, v) {
  if (a === b) return 0;
  return (v - a) / (b - a);
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Deterministic-ish RNG (seeded), so Reset feels consistent.
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal using Box–Muller.
export function randn(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function normalClamped(rng, mean, stdev, min, max) {
  const x = mean + randn(rng) * stdev;
  return clamp(x, min, max);
}

export function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function sum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

export function mean(arr) {
  return arr.length ? sum(arr) / arr.length : 0;
}

export function stddev(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  let v = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    v += d * d;
  }
  v /= arr.length;
  return Math.sqrt(v);
}

export function mixColorRgb(c1, c2, t) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

// Approximation for standard normal CDF Φ(z)
// Abramowitz & Stegun-inspired erf approximation (good enough for UI percentiles).
export function normCdf(z) {
  const x = z / Math.SQRT2;
  // erf(x) approximation
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf =
    sign *
    (1 -
      (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
        Math.exp(-ax * ax));
  return 0.5 * (1 + erf);
}


