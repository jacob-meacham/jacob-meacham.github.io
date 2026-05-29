# CA Reservoirs Water-Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive, data-grounded California water-balance model (`lab/water-viz/`) and an accompanying blog post that lets readers drag levers (population, per-capita use, new reservoirs, climate) and watch statewide reservoir levels — and low-reservoir events avoided — recompute over 1950–2024.

**Architecture:** A pure `model.js` water-balance function fed by real historical series baked into `data.js`. Two HTML front-ends share the model + chart code: a compact `embed.html` (iframed into the post) and a full-page `index.html`. Vanilla JS ES modules, SVG charts, no framework — mirrors the existing `lab/comp-viz/`.

**Tech Stack:** Vanilla JS (ES modules), SVG, Jekyll static serving, `node --test` for unit tests (Node 24, zero deps).

**Reference material:**
- Spec: `docs/superpowers/specs/2026-05-28-ca-reservoirs-water-model-design.md`
- Working prototype (gitignored scratch): `.superpowers/brainstorm/*/prototype.mjs` — model logic and data ported below.
- Pattern to follow: `lab/comp-viz/` (module layout, `$()` helper, embed+index split, iframe in post).

**Conventions:**
- All files under `lab/water-viz/`. `index.html`/`embed.html` have NO Jekyll front matter (served verbatim, like comp-viz).
- No emdashes/endashes in prose (per writing style guide); use single hyphen with spaces.
- Test files end `.test.mjs`; run with `node --test lab/water-viz/src/`.

---

## Task 1: Scaffold directory + data.js with real series

**Files:**
- Create: `lab/water-viz/src/data.js`
- Test: `lab/water-viz/src/data.test.mjs`

- [ ] **Step 1: Write the failing test**

`lab/water-viz/src/data.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YEARS, RUNOFF, POP, GPCD, AG, CAP, PROJECTS, CONST } from './data.js';

test('series are annual 1950-2024 and aligned', () => {
  assert.equal(YEARS[0], 1950);
  assert.equal(YEARS.at(-1), 2024);
  assert.equal(YEARS.length, 75);
  for (const s of [RUNOFF, POP, GPCD, AG, CAP]) assert.equal(s.length, 75);
});

test('runoff anchors match CDEC WSIHIST', () => {
  const i = (y) => YEARS.indexOf(y);
  assert.equal(RUNOFF[i(1977)], 5.12);  // driest on record
  assert.equal(RUNOFF[i(2017)], 37.82); // wettest
});

test('series are in plausible physical ranges', () => {
  assert.ok(Math.min(...POP) >= 10 && Math.max(...POP) <= 40);   // millions
  assert.ok(Math.min(...CAP) >= 9 && Math.max(...CAP) <= 45);    // MAF
  assert.ok(Math.min(...AG) >= 18 && Math.max(...AG) <= 42);     // MAF
  assert.ok(CAP.every((c, i) => i === 0 || c >= CAP[i - 1] - 0.01)); // capacity non-decreasing
});

test('projects have required fields', () => {
  assert.ok(PROJECTS.length >= 6);
  for (const p of PROJECTS) {
    assert.ok(typeof p.id === 'string' && p.id.length);
    assert.ok(typeof p.name === 'string');
    assert.ok(typeof p.capacity === 'number' && p.capacity > 0); // MAF
  }
  assert.ok(PROJECTS.some((p) => p.id === 'sites'));
  assert.ok(PROJECTS.some((p) => p.id === 'auburn'));
});

test('constants present', () => {
  for (const k of ['K_INFLOW', 'DEADPOOL', 'INIT_STORAGE', 'LOW_FRAC', 'GAL_PER_MAF'])
    assert.ok(typeof CONST[k] === 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lab/water-viz/src/data.test.mjs`
Expected: FAIL — `Cannot find module './data.js'`.

- [ ] **Step 3: Write data.js**

`lab/water-viz/src/data.js`:
```js
// Real historical series for the CA water-balance model. All volumes in million
// acre-feet (MAF), water years. Sources cited per series; see the design spec.

// Sacramento 4-river runoff ("SacWYsum", MAF). Source: CDEC WSIHIST
// https://cdec.water.ca.gov/reportapp/javareports?name=WSIHIST (true annual values).
const RUNOFF_BY_YEAR = {
  1950:14.44,1951:22.95,1952:28.60,1953:20.09,1954:17.43,1955:10.98,1956:29.89,1957:14.89,
  1958:29.71,1959:12.05,1960:13.06,1961:11.97,1962:15.11,1963:22.99,1964:10.92,1965:25.64,
  1966:12.95,1967:24.06,1968:13.64,1969:26.98,1970:24.06,1971:22.57,1972:13.43,1973:20.05,
  1974:32.50,1975:19.23,1976:8.20,1977:5.12,1978:23.92,1979:12.41,1980:22.33,1981:11.10,
  1982:33.41,1983:37.68,1984:22.35,1985:11.04,1986:25.83,1987:9.27,1988:9.23,1989:14.82,
  1990:9.26,1991:8.44,1992:8.87,1993:22.21,1994:7.81,1995:34.55,1996:22.29,1997:25.42,
  1998:31.40,1999:21.19,2000:18.90,2001:9.81,2002:14.60,2003:19.31,2004:16.04,2005:18.55,
  2006:32.09,2007:10.28,2008:10.28,2009:13.02,2010:16.01,2011:25.21,2012:11.84,2013:12.19,
  2014:7.46,2015:9.23,2016:17.48,2017:37.82,2018:12.86,2019:24.77,2020:9.71,2021:6.37,
  2022:10.79,2023:24.11,2024:17.47,
};

export const YEARS = Object.keys(RUNOFF_BY_YEAR).map(Number).sort((a, b) => a - b);
export const RUNOFF = YEARS.map((y) => RUNOFF_BY_YEAR[y]);

// Linear interpolation from benchmark {year: value} to a per-YEAR array.
// Benchmark sources: see comments on each call. Interpolated years are estimates.
function interpToYears(benchmarks) {
  const xs = Object.keys(benchmarks).map(Number).sort((a, b) => a - b);
  const at = (year) => {
    if (year <= xs[0]) return benchmarks[xs[0]];
    if (year >= xs.at(-1)) return benchmarks[xs.at(-1)];
    for (let i = 0; i < xs.length - 1; i++) {
      if (year >= xs[i] && year <= xs[i + 1]) {
        const t = (year - xs[i]) / (xs[i + 1] - xs[i]);
        return benchmarks[xs[i]] + t * (benchmarks[xs[i + 1]] - benchmarks[xs[i]]);
      }
    }
  };
  return YEARS.map((y) => +at(y).toFixed(4));
}

// CA population (millions). US Census decennial + CA DOF estimates.
export const POP = interpToYears({
  1950: 10.586, 1960: 15.717, 1970: 19.953, 1980: 23.668, 1990: 29.760,
  2000: 33.872, 2010: 37.254, 2020: 39.538, 2024: 39.43,
});

// Urban per-capita use (GPCD). PPIC / Pacific Institute.
export const GPCD = interpToYears({
  1950: 170, 1960: 177, 1990: 231, 2007: 231, 2010: 180, 2015: 146, 2024: 155,
});

// Agricultural applied water (MAF). Pacific Institute (2020) / DWR Bulletin 160.
// Rose to a ~1980 high, flat-to-declining since.
export const AG = interpToYears({
  1950: 22, 1960: 25.5, 1970: 30, 1980: 37, 1990: 31, 1995: 30,
  2000: 34, 2008: 37, 2015: 32.4, 2020: 32, 2024: 31,
});

// Total surface reservoir capacity (MAF). Big-reservoir buildout (CDEC/USBR/Wikipedia
// completion years) scaled so the stepped statewide total reaches ~43 MAF.
export const CAP = interpToYears({
  1950: 10.3, 1960: 15.2, 1970: 33.3, 1980: 41.6, 1990: 42.2, 2000: 43.0, 2024: 43.5,
});

// Buildable / proposed reservoirs. capacity = new storage added (MAF). Sources:
// California Water Commission / WSIP, project authorities, PPIC. Off-stream projects
// fill only from wet-year high flows.
export const PROJECTS = [
  { id: 'sites',       name: 'Sites Reservoir',         capacity: 1.5,  type: 'off-stream', status: 'in development' },
  { id: 'temperance',  name: 'Temperance Flat',         capacity: 1.26, type: 'on-stream',  status: 'shelved' },
  { id: 'shasta',      name: 'Shasta Dam raise',        capacity: 0.63, type: 'on-stream',  status: 'contested' },
  { id: 'sisk',        name: 'B.F. Sisk raise',         capacity: 0.13, type: 'off-stream', status: 'funded' },
  { id: 'losvaqueros', name: 'Los Vaqueros expansion',  capacity: 0.115, type: 'off-stream', status: 'shelved' },
  { id: 'pacheco',     name: 'Pacheco expansion',       capacity: 0.13, type: 'off-stream', status: 'suspended' },
  { id: 'delpuerto',   name: 'Del Puerto Canyon',       capacity: 0.082, type: 'off-stream', status: 'proposed' },
  { id: 'auburn',      name: 'Auburn Dam (never built)', capacity: 2.3, type: 'on-stream',  status: 'never built' },
];

export const CONST = {
  K_INFLOW: 2.2,       // scales Sac 4-river runoff to a statewide surface-inflow proxy
  DEADPOOL: 4.0,       // MAF below which no water can be delivered
  INIT_STORAGE: 20.0,  // MAF in 1950
  LOW_FRAC: 0.33,      // low-reservoir event = storage < this * physical capacity
  GAL_PER_MAF: 325851e6,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lab/water-viz/src/data.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/water-viz/src/data.js lab/water-viz/src/data.test.mjs
git commit -m "Add CA water-model data series with integrity tests"
```

---

## Task 2: model.js — pure water-balance function

**Files:**
- Create: `lab/water-viz/src/model.js`
- Test: `lab/water-viz/src/model.test.mjs`

- [ ] **Step 1: Write the failing test**

`lab/water-viz/src/model.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runModel } from './model.js';
import { YEARS, CONST } from './data.js';

const iy = (y) => YEARS.indexOf(y);

test('baseline output shape', () => {
  const r = runModel({});
  assert.equal(r.years.length, 75);
  assert.equal(r.storage.length, 75);
  assert.equal(r.lowLine.length, 75);
  assert.ok(r.storage.every((s) => s >= CONST.DEADPOOL - 0.001));
});

test('baseline reproduces historical drought lows', () => {
  const r = runModel({});
  // storage drains to deadpool in the real severe droughts
  for (const y of [1977, 1991, 1992, 2014, 2015, 2022]) {
    assert.ok(r.storage[iy(y)] <= 5, `expected ${y} near deadpool`);
  }
  // and refills in the real wet years
  for (const y of [1983, 1998, 2017, 2019]) {
    assert.ok(r.storage[iy(y)] >= 35, `expected ${y} near full`);
  }
});

test('baseline low-event count locks prototype behavior', () => {
  assert.equal(runModel({}).metrics.lowEvents, 25);
});

test('building ALL proposed reservoirs avoids ~0 low events', () => {
  const base = runModel({}).metrics.lowEvents;
  const built = runModel({ addedCapacity: 3.3 }).metrics.lowEvents;
  assert.equal(base - built, 0);
});

test('population restraint avoids more low events than realistic reservoirs', () => {
  const base = runModel({}).metrics.lowEvents;
  const pop1970 = base - runModel({ popOverride: 19.953 }).metrics.lowEvents;
  const resv = base - runModel({ addedCapacity: 3.3 }).metrics.lowEvents;
  assert.ok(pop1970 > resv, `pop lever (${pop1970}) should beat reservoirs (${resv})`);
});

test('drier climate increases the supply gap', () => {
  const base = runModel({}).metrics.totalShort;
  const drier = runModel({ climateMult: 0.85 }).metrics.totalShort;
  assert.ok(drier > base);
});

test('levers default to actual when omitted (idempotent baseline)', () => {
  assert.deepEqual(runModel({}).storage, runModel({ popOverride: null, gpcdCap: null }).storage);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lab/water-viz/src/model.test.mjs`
Expected: FAIL — `Cannot find module './model.js'`.

- [ ] **Step 3: Write model.js**

`lab/water-viz/src/model.js`:
```js
import { YEARS, RUNOFF, POP, GPCD, AG, CAP, CONST } from './data.js';

const { K_INFLOW, DEADPOOL, INIT_STORAGE, LOW_FRAC, GAL_PER_MAF } = CONST;

function urbanMAF(popMillions, gpcd) {
  return (popMillions * 1e6 * gpcd * 365) / GAL_PER_MAF;
}

// Run the annual water balance under a set of levers.
// levers: { popOverride?, gpcdCap?, addedCapacity?, climateMult? }
// Returns per-year arrays plus summary metrics.
export function runModel(levers = {}) {
  const {
    popOverride = null,   // freeze CA population (millions)
    gpcdCap = null,       // cap per-capita use (GPCD)
    addedCapacity = 0,    // extra reservoir capacity (MAF)
    climateMult = 1.0,    // multiply inflow (drier future < 1)
  } = levers;

  let storage = INIT_STORAGE;
  const out = {
    years: YEARS.slice(),
    storage: [], capacity: CAP.slice(), lowLine: CAP.map((c) => +(LOW_FRAC * c).toFixed(3)),
    shortfall: [], demand: [], spill: [], low: [],
  };
  let lowEvents = 0, shortYears = 0, totalShort = 0, totalSpill = 0, sumStorage = 0;

  for (let i = 0; i < YEARS.length; i++) {
    const pop = popOverride != null ? popOverride : POP[i];
    const g = gpcdCap != null ? Math.min(GPCD[i], gpcdCap) : GPCD[i];
    const demand = AG[i] + urbanMAF(pop, g);

    const inflow = RUNOFF[i] * K_INFLOW * climateMult;
    const capacity = CAP[i] + addedCapacity;

    let avail = storage + inflow;
    const delivered = Math.min(demand, Math.max(0, avail - DEADPOOL));
    const shortfall = demand - delivered;
    avail -= delivered;
    let spill = 0;
    if (avail > capacity) { spill = avail - capacity; avail = capacity; }
    storage = avail;

    const isLow = storage < LOW_FRAC * CAP[i]; // vs PHYSICAL capacity
    if (isLow) lowEvents++;
    if (shortfall > 0.05) { shortYears++; totalShort += shortfall; }
    totalSpill += spill;
    sumStorage += storage;

    out.storage.push(+storage.toFixed(2));
    out.shortfall.push(+shortfall.toFixed(2));
    out.demand.push(+demand.toFixed(2));
    out.spill.push(+spill.toFixed(2));
    out.low.push(isLow);
  }

  out.metrics = {
    lowEvents,
    shortYears,
    totalShort: +totalShort.toFixed(1),
    totalSpill: +totalSpill.toFixed(0),
    avgStorage: +(sumStorage / YEARS.length).toFixed(1),
    pctDemandMet: +(100 * (1 - totalShort / out.demand.reduce((a, b) => a + b, 0))).toFixed(1),
  };
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lab/water-viz/src/model.test.mjs`
Expected: PASS (7 tests). If `lowEvents !== 25`, the data series in Task 1 diverged from the prototype — diff against `prototype.mjs` before changing the assertion.

- [ ] **Step 5: Commit**

```bash
git add lab/water-viz/src/model.js lab/water-viz/src/model.test.mjs
git commit -m "Add pure water-balance model with behavior tests"
```

---

## Task 3: charts.js — pure chart helpers + renderers

**Files:**
- Create: `lab/water-viz/src/charts.js`
- Test: `lab/water-viz/src/charts.test.mjs`

The scale math is unit-tested; the DOM rendering is verified visually in Task 7.

- [ ] **Step 1: Write the failing test**

`lab/water-viz/src/charts.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScales, polylinePoints } from './charts.js';

test('makeScales maps domain edges to plot box', () => {
  const s = makeScales({ n: 75, yMax: 45, W: 900, H: 380, L: 42, R: 12, T: 18, B: 28 });
  assert.equal(s.x(0), 42);
  assert.equal(s.x(74), 888);          // W - R
  assert.equal(s.y(0), 352);           // H - B
  assert.equal(s.y(45), 18);           // T
});

test('polylinePoints builds an SVG points string', () => {
  const s = makeScales({ n: 3, yMax: 10, W: 100, H: 100, L: 0, R: 0, T: 0, B: 0 });
  const pts = polylinePoints([0, 5, 10], s);
  assert.equal(pts.split(' ').length, 3);
  assert.match(pts, /^0,100/);         // first point: x=0, y=100 (value 0 at bottom)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lab/water-viz/src/charts.test.mjs`
Expected: FAIL — `Cannot find module './charts.js'`.

- [ ] **Step 3: Write charts.js**

`lab/water-viz/src/charts.js`:
```js
const NS = 'http://www.w3.org/2000/svg';

// Pure: build x/y scale fns mapping data index/value to SVG coordinates.
export function makeScales({ n, yMax, W, H, L, R, T, B }) {
  const pW = W - L - R, pH = H - T - B;
  return {
    W, H, L, R, T, B, pW, pH, yMax, n,
    x: (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * pW),
    y: (v) => T + (1 - v / yMax) * pH,
  };
}

// Pure: SVG points attribute for a polyline over a value array.
export function polylinePoints(values, s) {
  return values.map((v, i) => `${+s.x(i).toFixed(1)},${+s.y(v).toFixed(1)}`).join(' ');
}

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// Render the storage-over-time chart into `mount`.
// data: { years, capacity, lowLine, baseline, scenario, lowFlags }
export function renderStorageChart(mount, data, opts = {}) {
  const W = opts.W || 900, H = opts.H || 360;
  const s = makeScales({ n: data.years.length, yMax: 45, W, H, L: 42, R: 12, T: 16, B: 26 });
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' });

  for (let v = 0; v <= 40; v += 10) {
    svg.appendChild(el('line', { x1: s.L, y1: s.y(v), x2: W - s.R, y2: s.y(v), stroke: 'rgba(255,255,255,.07)' }));
    const t = el('text', { x: s.L - 6, y: s.y(v) + 3, fill: '#64748b', 'font-size': 10, 'text-anchor': 'end' });
    t.textContent = v; svg.appendChild(t);
  }
  data.years.forEach((yr, i) => {
    if (yr % 10 === 0) {
      const t = el('text', { x: s.x(i), y: H - 8, fill: '#64748b', 'font-size': 10, 'text-anchor': 'middle' });
      t.textContent = yr; svg.appendChild(t);
    }
  });

  // severe-drought shading
  [[1976,1977],[1987,1992],[2007,2010],[2012,2015],[2020,2022]].forEach(([a, b]) => {
    const ia = data.years.indexOf(a), ib = data.years.indexOf(b);
    if (ia < 0 || ib < 0) return;
    svg.appendChild(el('rect', { x: s.x(ia), y: s.T, width: s.x(ib) - s.x(ia) + s.pW / (s.n - 1), height: s.pH, fill: '#7f1d1d', 'fill-opacity': .18 }));
  });

  svg.appendChild(el('polyline', { points: polylinePoints(data.capacity, s), fill: 'none', stroke: '#64748b', 'stroke-width': 1.3, 'stroke-dasharray': '2 3' }));
  svg.appendChild(el('polyline', { points: polylinePoints(data.lowLine, s), fill: 'none', stroke: '#f59e0b', 'stroke-width': 1.5, 'stroke-dasharray': '5 4', 'stroke-opacity': .8 }));
  svg.appendChild(el('polyline', { points: polylinePoints(data.scenario, s), fill: 'none', stroke: '#22c55e', 'stroke-width': 2 }));
  svg.appendChild(el('polyline', { points: polylinePoints(data.baseline, s), fill: 'none', stroke: '#3b82f6', 'stroke-width': 2, 'stroke-opacity': .55 }));

  data.scenario.forEach((v, i) => {
    if (v < data.lowLine[i]) svg.appendChild(el('circle', { cx: s.x(i), cy: s.y(v), r: 2.6, fill: '#22c55e' }));
  });

  mount.replaceChildren(svg);
}

// Render the unmet-demand bar chart into `mount`.
export function renderGapChart(mount, data, opts = {}) {
  const W = opts.W || 900, H = opts.H || 90;
  const yMax = Math.max(2, ...data.shortfall);
  const s = makeScales({ n: data.years.length, yMax, W, H, L: 42, R: 12, T: 14, B: 14 });
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' });
  const bw = Math.max(2, s.pW / s.n - 1);
  data.shortfall.forEach((v, i) => {
    if (v <= 0.05) return;
    svg.appendChild(el('rect', { x: s.x(i) - bw / 2, y: s.y(v), width: bw, height: s.y(0) - s.y(v), fill: '#ef4444', 'fill-opacity': .8 }));
  });
  const t = el('text', { x: s.L, y: 11, fill: '#94a3b8', 'font-size': 10 });
  t.textContent = 'unmet demand / yr (MAF)'; svg.appendChild(t);
  mount.replaceChildren(svg);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lab/water-viz/src/charts.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/water-viz/src/charts.js lab/water-viz/src/charts.test.mjs
git commit -m "Add SVG chart renderers with pure-scale unit tests"
```

---

## Task 4: Embed front-end (Layout A) — controls on top, charts stacked

**Files:**
- Create: `lab/water-viz/embed.html`
- Create: `lab/water-viz/embed.css`
- Create: `lab/water-viz/src/embed-main.js`

- [ ] **Step 1: Write embed.html**

`lab/water-viz/embed.html` (NO Jekyll front matter):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>California reservoirs: a water-balance model</title>
    <link rel="stylesheet" href="./embed.css" />
  </head>
  <body>
    <div class="app">
      <div class="metrics">
        <span class="pill" id="pill-low">Low-reservoir years: -</span>
        <span class="pill" id="pill-avoided">Avoided vs actual: -</span>
        <span class="pill" id="pill-met">Demand met: -</span>
        <span class="pill" id="pill-spill">Spilled: -</span>
      </div>

      <div class="controls">
        <div class="knob">
          <label>Population <output id="v-pop">actual</output></label>
          <input id="s-pop" type="range" min="10.6" max="39.5" step="0.1" value="39.5" />
        </div>
        <div class="knob">
          <label>Per-capita use <output id="v-gpcd">actual</output></label>
          <input id="s-gpcd" type="range" min="100" max="231" step="1" value="231" />
        </div>
        <div class="knob">
          <label>Drier future <output id="v-climate">0%</output></label>
          <input id="s-climate" type="range" min="0" max="30" step="1" value="0" />
        </div>
        <div class="knob">
          <label>Go further (extra capacity) <output id="v-extra">0 MAF</output></label>
          <input id="s-extra" type="range" min="0" max="25" step="0.5" value="0" />
        </div>
        <div class="projects" id="projects"></div>
        <button id="btn-reset" class="btn">Reset</button>
      </div>

      <div class="chart" id="chart-storage"></div>
      <div class="legend" id="legend"></div>
      <div class="chart" id="chart-gap"></div>
    </div>
    <script type="module" src="./src/embed-main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write embed.css**

`lab/water-viz/embed.css`:
```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #0b1220; color: #e2e8f0;
  font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.app { padding: 12px; }
.metrics { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.pill { background: #10203a; border-radius: 999px; padding: 4px 10px; font-size: 12px; }
.controls { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-bottom: 12px; }
.knob label { display: flex; justify-content: space-between; font-size: 11px;
  text-transform: uppercase; letter-spacing: .04em; opacity: .7; }
.knob output { opacity: 1; font-weight: 600; }
.knob input[type=range] { width: 100%; }
.projects { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 11px; padding: 3px 8px; border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px; cursor: pointer; user-select: none; }
.chip.on { background: #1f6feb33; border-color: #1f6feb; }
.btn { grid-column: 1 / -1; justify-self: start; background: #1e293b; color: #e2e8f0;
  border: 1px solid rgba(255,255,255,.15); border-radius: 8px; padding: 5px 12px; cursor: pointer; }
.chart { background: #0b1220; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; margin-bottom: 6px; }
.legend { font-size: 11px; opacity: .85; margin: 2px 0 8px; }
.legend span { margin-right: 12px; }
.sw { display: inline-block; width: 12px; height: 3px; vertical-align: middle; margin-right: 4px; }
@media (max-width: 520px) { .controls { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Write embed-main.js**

`lab/water-viz/src/embed-main.js`:
```js
import { runModel } from './model.js';
import { renderStorageChart, renderGapChart } from './charts.js';
import { PROJECTS } from './data.js';

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

const ui = {
  pop: $('s-pop'), gpcd: $('s-gpcd'), climate: $('s-climate'), extra: $('s-extra'),
  vPop: $('v-pop'), vGpcd: $('v-gpcd'), vClimate: $('v-climate'), vExtra: $('v-extra'),
  projects: $('projects'), reset: $('btn-reset'),
  chartStorage: $('chart-storage'), chartGap: $('chart-gap'), legend: $('legend'),
  low: $('pill-low'), avoided: $('pill-avoided'), met: $('pill-met'), spill: $('pill-spill'),
};

const POP_MAX = 39.5; // slider max = "actual" (no override)
const GPCD_MAX = 231; // slider max = "actual"
const selected = new Set();

PROJECTS.forEach((p) => {
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = `${p.name} +${p.capacity} MAF`;
  chip.title = `${p.type}, ${p.status}`;
  chip.onclick = () => {
    chip.classList.toggle('on');
    if (selected.has(p.id)) selected.delete(p.id); else selected.add(p.id);
    update();
  };
  chip.dataset.id = p.id;
  ui.projects.appendChild(chip);
});

ui.legend.innerHTML =
  '<span><span class="sw" style="background:#3b82f6;opacity:.55"></span>actual</span>' +
  '<span><span class="sw" style="background:#22c55e"></span>your scenario</span>' +
  '<span><span class="sw" style="background:#f59e0b"></span>low threshold</span>' +
  '<span><span class="sw" style="background:#64748b"></span>capacity</span>';

function leversFromUI() {
  const popVal = +ui.pop.value;
  const gpcdVal = +ui.gpcd.value;
  const projectCap = PROJECTS.filter((p) => selected.has(p.id)).reduce((a, p) => a + p.capacity, 0);
  return {
    popOverride: popVal >= POP_MAX ? null : popVal,
    gpcdCap: gpcdVal >= GPCD_MAX ? null : gpcdVal,
    climateMult: 1 - (+ui.climate.value) / 100,
    addedCapacity: projectCap + (+ui.extra.value),
  };
}

const baseline = runModel({});

function update() {
  const levers = leversFromUI();
  const scenario = runModel(levers);

  ui.vPop.textContent = levers.popOverride == null ? 'actual' : `${levers.popOverride.toFixed(1)}M`;
  ui.vGpcd.textContent = levers.gpcdCap == null ? 'actual' : `${levers.gpcdCap} GPCD`;
  ui.vClimate.textContent = `-${ui.climate.value}%`;
  ui.vExtra.textContent = `${(+ui.extra.value).toFixed(1)} MAF`;

  renderStorageChart(ui.chartStorage, {
    years: scenario.years, capacity: scenario.capacity, lowLine: scenario.lowLine,
    baseline: baseline.storage, scenario: scenario.storage,
  });
  renderGapChart(ui.chartGap, { years: scenario.years, shortfall: scenario.shortfall });

  const avoided = baseline.metrics.lowEvents - scenario.metrics.lowEvents;
  ui.low.textContent = `Low-reservoir years: ${scenario.metrics.lowEvents}`;
  ui.avoided.textContent = `Avoided vs actual: ${avoided >= 0 ? '+' : ''}${avoided}`;
  ui.met.textContent = `Demand met: ${scenario.metrics.pctDemandMet}%`;
  ui.spill.textContent = `Spilled: ${scenario.metrics.totalSpill} MAF`;
}

[ui.pop, ui.gpcd, ui.climate, ui.extra].forEach((s) => s.addEventListener('input', update));
ui.reset.onclick = () => {
  ui.pop.value = POP_MAX; ui.gpcd.value = GPCD_MAX; ui.climate.value = 0; ui.extra.value = 0;
  selected.clear();
  ui.projects.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
  update();
};

update();
```

- [ ] **Step 4: Verify the embed loads (manual)**

Run: `bundle exec jekyll serve` (in another terminal), then open `http://localhost:4000/lab/water-viz/embed.html`.
Expected: controls render, charts draw, dragging Population/Per-capita/Drier/Go-further updates the green line and the metric pills; toggling project chips adds capacity. No console errors.

- [ ] **Step 5: Commit**

```bash
git add lab/water-viz/embed.html lab/water-viz/embed.css lab/water-viz/src/embed-main.js
git commit -m "Add embed front-end for water-viz (controls + charts)"
```

---

## Task 5: Full-page front-end (Layout B) — controls in a left sidebar

**Files:**
- Create: `lab/water-viz/index.html`
- Create: `lab/water-viz/styles.css`
- Create: `lab/water-viz/src/main.js`

- [ ] **Step 1: Write index.html**

`lab/water-viz/index.html` (NO Jekyll front matter):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>California reservoirs, droughts & population - a water-balance model</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="page">
      <header>
        <h1>California reservoirs, droughts &amp; population</h1>
        <p class="sub">Drag the levers and watch statewide reservoir levels - and the
          droughts they fail to prevent - recompute over 1950-2024. A transparent toy model;
          the lever ranking is the point, not the exact figures.</p>
      </header>
      <div class="layout">
        <aside class="sidebar">
          <div class="group-title">Demand</div>
          <div class="knob"><label>Population <output id="v-pop">actual</output></label>
            <input id="s-pop" type="range" min="10.6" max="39.5" step="0.1" value="39.5" /></div>
          <div class="knob"><label>Per-capita use <output id="v-gpcd">actual</output></label>
            <input id="s-gpcd" type="range" min="100" max="231" step="1" value="231" /></div>
          <div class="group-title">Climate</div>
          <div class="knob"><label>Drier future <output id="v-climate">0%</output></label>
            <input id="s-climate" type="range" min="0" max="30" step="1" value="0" /></div>
          <div class="group-title">Build storage</div>
          <div class="projects" id="projects"></div>
          <div class="knob"><label>Go further <output id="v-extra">0 MAF</output></label>
            <input id="s-extra" type="range" min="0" max="25" step="0.5" value="0" /></div>
          <button id="btn-reset" class="btn">Reset to actual</button>
        </aside>
        <main class="main">
          <div class="metrics">
            <span class="pill" id="pill-low">Low-reservoir years: -</span>
            <span class="pill" id="pill-avoided">Avoided vs actual: -</span>
            <span class="pill" id="pill-met">Demand met: -</span>
            <span class="pill" id="pill-spill">Spilled: -</span>
          </div>
          <div class="chart" id="chart-storage"></div>
          <div class="legend" id="legend"></div>
          <div class="chart" id="chart-gap"></div>
        </main>
      </div>
    </div>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write styles.css**

`lab/water-viz/styles.css`:
```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #070d18; color: #e2e8f0;
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.page { max-width: 1100px; margin: 0 auto; padding: 24px 18px 60px; }
header h1 { margin: 0 0 6px; font-size: 26px; }
.sub { opacity: .75; max-width: 70ch; margin: 0 0 20px; }
.layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
.sidebar { background: #0b1220; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 14px; height: max-content; }
.group-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; opacity: .55; margin: 12px 0 4px; }
.group-title:first-child { margin-top: 0; }
.knob label { display: flex; justify-content: space-between; font-size: 12px; opacity: .8; }
.knob output { font-weight: 600; }
.knob input[type=range] { width: 100%; margin: 4px 0 8px; }
.projects { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; padding: 4px 9px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; cursor: pointer; user-select: none; }
.chip.on { background: #1f6feb33; border-color: #1f6feb; }
.btn { margin-top: 12px; width: 100%; background: #1e293b; color: #e2e8f0; border: 1px solid rgba(255,255,255,.15); border-radius: 8px; padding: 7px; cursor: pointer; }
.metrics { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.pill { background: #10203a; border-radius: 999px; padding: 5px 12px; font-size: 13px; }
.chart { background: #0b1220; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 6px; margin-bottom: 6px; }
.legend { font-size: 12px; opacity: .85; margin: 4px 0 10px; }
.legend span { margin-right: 14px; }
.sw { display: inline-block; width: 13px; height: 3px; vertical-align: middle; margin-right: 4px; }
@media (max-width: 720px) { .layout { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Write main.js**

`lab/water-viz/src/main.js`:
```js
// Full-page front-end. Shares model + charts with the embed; same control IDs,
// so the wiring is identical. Kept as its own entry to allow page-specific tweaks.
import './embed-main.js';
```

Note: `index.html` and `embed.html` use identical control/element IDs, so `embed-main.js`
drives both. `main.js` re-exports it as the page's entry point. If the full page later needs
extra panels, give them new IDs and extend here.

- [ ] **Step 4: Verify the full page (manual)**

Run: open `http://localhost:4000/lab/water-viz/` .
Expected: sidebar layout, same interactivity as the embed, responsive collapse under 720px.

- [ ] **Step 5: Commit**

```bash
git add lab/water-viz/index.html lab/water-viz/styles.css lab/water-viz/src/main.js
git commit -m "Add full-page front-end for water-viz"
```

---

## Task 6: Draft the blog post

**Files:**
- Create: `_drafts/california-reservoirs.md`

- [ ] **Step 1: Write the draft with the embed and section scaffold**

`_drafts/california-reservoirs.md`:
```markdown
---
title: >
    The reservoir we can't fill
layout: post
group: blog
description: >
    Why building more dams is the weakest lever against California's droughts
---

# I.

[Open on the recurring image: California reservoirs low again, the cracked-mud
photographs, the reflexive call to build more dams. State the question the post
will actually answer: of the levers we argue about - build storage, slow growth,
use less - which one would have done the most?]

# II.

[What a reservoir actually does: it moves wet-year water into dry years. It does
not create water. Introduce the three forces - how much falls (climate), how much
we use (demand), how much we can hold (supply) - and note that storage only helps
to the extent there is surplus to store.]

# III.

To see how these forces interact, I built a small model of California's surface
reservoirs from 1950 to today. It runs a yearly water balance on real data - actual
runoff, the real dam-building record, population, farm and city demand - and lets
you change one thing at a time. Try the obvious fix first: switch on every reservoir
seriously proposed today.

<iframe src="/lab/water-viz/embed.html" style="width: 100%; height: 760px; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #0b1220;" frameborder="0" loading="lazy"></iframe>

<p style="text-align: center; font-size: 0.85em; color: #888; margin-top: 8px;">
<a href="/lab/water-viz/" target="_blank">Open the full version in a new tab</a> for the best experience.
</p>

[Reveal: building all of them avoids essentially zero low-reservoir events. Name why.]

# IV.

[The three dynamics worth watching, in the model's voice:
- You can't fill what won't fill: in the deep droughts the new reservoirs sit empty;
  spill barely moves as you add capacity.
- Population is a bigger lever than concrete - even though cities are ~20% of use.
- But the giant nobody toggles is agriculture: ~80% of use, and it decoupled from
  population decades ago as farms shifted to permanent crops that can't be fallowed.
- A modestly drier climate swamps every supply-side fix.]

# V.

[The uncomfortable conclusion: the popular answer is the least effective; the
effective answers are the politically hardest. Then the honest limitations - single
statewide bucket, groundwater out of model (the gap is really overdraft), snowpack
folded into runoff, absolute numbers depend on calibration. End on a sharp line, no
neat bow.]
```

- [ ] **Step 2: Draft the prose in Jacob's voice**

Replace each `[bracketed]` block with finished prose. Follow
`agent-instructions/writing/writing_like_jacob.md`: first person, measured claims, concrete
to abstract, metaphors from the author's own domains, no emdashes, cut aggressively, no neat
bow. Pull concrete numbers from the spec's findings section (events-avoided table, the ~2%
new-supply figure, ag ~80%, population 3.7x). Score against
`agent-instructions/writing/writing_assessment_rubric.md` (target LLM < 30, Jacob > 65) and
revise until it passes.

- [ ] **Step 3: Verify the draft renders**

Run: `bundle exec jekyll serve --drafts`, open the post URL.
Expected: post renders, iframe loads the embed inline, "open full version" link works.

- [ ] **Step 4: Commit**

```bash
git add _drafts/california-reservoirs.md
git commit -m "Draft California reservoirs post with interactive embed"
```

---

## Task 7: Browser verification + publish

**Files:**
- Modify: rename `_drafts/california-reservoirs.md` -> `_posts/2026-05-28-california-reservoirs.md`

- [ ] **Step 1: Run the full test suite**

Run: `node --test lab/water-viz/src/`
Expected: all tests pass (data, model, charts).

- [ ] **Step 2: Visual + interaction check (golden path and edge cases)**

With `bundle exec jekyll serve` running, in a browser check both
`/lab/water-viz/embed.html` and `/lab/water-viz/`:
- Baseline (all levers at actual): blue and green lines coincide; "Avoided vs actual: +0".
- Population to minimum: green line rises in moderate dry years, still crashes in deep droughts; avoided > 0.
- Toggle all projects + max "go further": capacity ceiling rises; confirm low events barely change at realistic levels, then drop only at extreme capacity.
- Drier future to -30%: gap grows, avoided goes negative.
- Reset restores baseline. Resize narrow (<520px embed / <720px page): layout collapses, charts stay readable.
- Check the browser console: no errors.

- [ ] **Step 3: Publish - move draft to _posts with date prefix**

```bash
git mv _drafts/california-reservoirs.md _posts/2026-05-28-california-reservoirs.md
```
Confirm the post appears in the blog index under `bundle exec jekyll serve`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Publish California reservoirs post"
```

---

## Self-Review notes (for the planner)

- **Spec coverage:** model mechanics (T2), all four levers + projects + go-further (T1 data, T4/T5 UI), storage trace + gap chart + events-avoided metric (T3/T4), embed + full-page split (T4/T5), post in Jacob's voice with limitations (T6), data provenance (T1 comments). Calibration guardrail is covered qualitatively (T2 baseline-reproduces-droughts test); recorded-CDEC overlay was discussed as optional and is intentionally out of scope for v1.
- **Open item flagged for execution:** `embed.html` iframe height (760px) is a guess; adjust in T7 after seeing real content height.
- **Type consistency:** `runModel(levers)` returns `{ years, storage, capacity, lowLine, shortfall, demand, spill, low, metrics }`; charts consume `{ years, capacity, lowLine, baseline, scenario }` and `{ years, shortfall }`; wiring maps between them explicitly. Project objects use `{ id, name, capacity, type, status }` everywhere.
