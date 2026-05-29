# Design: California Reservoirs, Droughts & Population — post + interactive model

**Date:** 2026-05-28
**Status:** Approved (design); ready for implementation planning
**Author:** Jacob (with Claude)

## 1. Summary

A blog post in Jacob's essayistic voice paired with an interactive, data-grounded
water-balance model of California's surface reservoirs (1950–2024). The reader drags
levers — population, per-capita use, new reservoirs, a drier climate — and watches the
statewide reservoir level recompute over time, along with a count of **low-reservoir
events avoided**.

The post is exploratory but lands a thesis the model earns:

> We argue endlessly about building more dams, but concrete is the weakest lever —
> reservoirs move water in *time*, they don't create it. The scarcity gap is set by
> climate (which we don't control) and by demand (dominated by agriculture, which
> stopped tracking population decades ago). Restraining demand does several times more
> than any reservoir we could realistically build. The popular answer is the least
> effective; the effective answers are the politically hardest.

This thesis is a synthesis between the two framings we started with ("supply can't win"
vs. "population / we stopped building"). The spike confirmed: supply genuinely can't win,
**and** population is a bigger lever than concrete (validating Jacob's pushback) — but the
true demand giant is agriculture, and climate dominates everything.

## 2. Spike findings (already run; these justify the thesis)

A prototype model (`prototype.mjs`, in the gitignored brainstorm scratch dir) ran the
real series through an annual water balance and tested each lever. Results are **robust
across inflow calibrations** (k = 2.0 / 2.2 / 2.5); the lever *ranking* is the load-bearing
output, not the absolute MAF figures.

**Share of the cumulative "supply gap" each lever closes:**

| Lever | Gap closed |
|---|---|
| Cut agricultural use 25% | 81–100% |
| Population frozen at 1950 | 53–75% |
| Population frozen at 1970 | 30–46% |
| Per-capita conservation (130 GPCD) | 29–38% |
| Go further: +10 MAF capacity | 9–31% |
| Build ALL proposed reservoirs (+3.3 MAF) | 3–11% |
| Drier future (−15% runoff) | −65% to −122% (worse) |

**Low-reservoir events avoided (of 25 baseline events; storage < 33% of capacity):**

| Lever | Events avoided |
|---|---|
| Cut ag 25% | 14 |
| Combo (1970 pop + conserve + 10 MAF) | 10 |
| Population frozen at 1950 | 6 |
| Per-capita conservation | 6 |
| Population frozen at 1970 | 3 |
| Go further (+10 MAF) | 2 |
| **Build ALL proposed reservoirs (+3.3 MAF)** | **0** |

The "cut ag" rows are **diagnostic lever tests**, not shipped controls — ag is not a user
knob (see §3). They're included to show how large the latent agricultural lever is relative
to the controls readers *can* touch.

Key qualitative insight for the prose: in *severe* multi-year droughts (1977, 1989–92,
2014–15) the reservoirs drain to deadpool no matter which lever you pull — the water never
fell. Lower demand helps in *moderate* dry years and speeds recovery. Wet-year spill barely
changes as capacity is added, proving the binding constraint is inflow, not storage.

## 3. The model

Annual water balance over water years 1950–2024, in million acre-feet (MAF). Conceptually a
single statewide surface-water bucket.

For each year `t`:

```
pop      = popOverride ?? CA_POP(t)
gpcd     = min(GPCD(t), gpcdCap ?? Infinity)
urban    = pop * gpcd * 365 / 325,851e6        // gallons -> MAF
ag       = AG(t)                                // real historical series; fixed (not a knob)
demand   = ag + urban

inflow   = RUNOFF(t) * K_INFLOW * climateMult   // Sac 4-river runoff scaled to statewide proxy
capacity = CAP(t) + addedCapacity               // physical buildout + toggled/slider reservoirs

avail       = storage_prev + inflow
delivered   = min(demand, max(0, avail - DEADPOOL))
shortfall   = demand - delivered                // "supply gap" (met in reality by groundwater)
storage     = avail - delivered
spill       = max(0, storage - capacity); storage = min(storage, capacity)

lowEvent    = storage < LOW_FRAC * CAP(t)        // 33% of *physical* capacity
```

Constants (prototype values; tune during build): `K_INFLOW ≈ 2.2`, `DEADPOOL = 4.0`,
`INIT_STORAGE = 20.0`, `LOW_FRAC = 0.33`.

**Calibration / honesty guardrail.** The baseline run (all levers at "actual") must
reproduce the historical pattern: storage drains to deadpool in the real droughts and
spills in the real wet years. We plot recorded statewide storage (CDEC, available from
~1970) as a faint reference so readers can see the model tracks reality before trusting the
counterfactuals. Absolute MAF figures are illustrative; the lever *ranking* is the claim.

### Levers (controls)

1. **Population scenario** — override CA population (presets: actual / freeze at 1970 /
   freeze at 1950 / a slider). Scales urban demand only.
2. **Per-capita use (conservation)** — cap or scale GPCD. Separate from headcount.
3. **New reservoirs** — toggles for real projects, each adding capacity:
   Sites (+1.5 MAF), Temperance Flat (+1.26), Shasta raise (+0.63), B.F. Sisk raise (+0.13),
   Del Puerto (+0.08), Los Vaqueros expansion (+0.115), Pacheco (+0.13), Auburn (+2.3, never
   built). Plus a **"go further" slider** for hypothetical extra MAF.
4. **Drier future (climate)** — scalar multiplying inflow (e.g. −10% / −20%).

Ag demand is a fixed real series (decision: not a user knob), but the prose/model notes that
ag is the dominant share and the largest *latent* lever.

### Outputs

- **Primary chart:** statewide reservoir storage over time — scenario line vs. actual
  baseline, with capacity ceiling, the low-event threshold line, drought shading, and
  markers on low-reservoir years. (The chart built in the brainstorm session is the
  reference design.)
- **Secondary:** unmet-demand-per-year bars (the supply gap).
- **Headline metrics:** low-reservoir events (and **events avoided** vs. baseline),
  years in shortfall, % demand met, water spilled.

## 4. Interactive piece — layout & architecture

Mirrors the existing `lab/comp-viz/` precedent exactly.

```
lab/water-viz/
  index.html        full-page version (Layout B: controls in a left sidebar)
  embed.html        in-post iframe (Layout A: controls on top, charts stacked)
  styles.css
  embed.css
  src/
    data.js         real series as JSON consts, each with an inline source citation
    model.js        pure water-balance fn: (series, levers) -> {trace, metrics}
    charts.js       canvas/SVG time-series + bar chart
    main.js         full-page wiring
    embed-main.js   embed wiring
```

- Vanilla JS ES modules, `<script type="module">`, no framework — same as comp-viz.
- The post embeds via `<iframe src="/lab/water-viz/embed.html" ...>` plus an
  "open the full version" link, matching the comp-viz post pattern.
- `model.js` is a pure function (no DOM) so it's trivially testable and the prototype's
  logic ports directly.

## 5. Post structure (Jacob's voice)

Roman-numeral sections, concrete → abstract, measured claims, honest caveats, no neat bow.
Rough arc:
- **I.** The recurring image: California reservoirs low again; the reflexive "build more dams."
- **II.** What reservoirs actually do — store wet-year water for dry years; they don't create
  water. Introduce the three forces: climate, demand, supply.
- **III.** The interactive model (embed). Invite the reader to try the obvious fix — build
  every proposed reservoir — and discover it avoids ~0 drought events.
- **IV.** Why: you can't fill what won't fill; proposed capacity is ~2% of annual use; spill
  barely moves. Population is a bigger lever than concrete — but agriculture (flat, ~80%,
  decoupled from population) is the real giant, and climate swamps all of it.
- **V.** The uncomfortable conclusion + honest limitations.

Target rubric: LLM score < 30, Jacob score > 65 (per AGENTS.md).

## 6. Data sources & provenance

All series gathered in the research pass; stored in `data.js` with per-series citations.

- **Runoff (engine input):** Sacramento 4-river index ("SacWYsum", MAF), annual 1950–2024.
  Source: CDEC WSIHIST — https://cdec.water.ca.gov/reportapp/javareports?name=WSIHIST .
  Range 5.12 (1977) – 37.82 (2017), mean ~17.65.
- **Reservoir capacity buildout:** major-reservoir completion years + capacities (CDEC,
  Wikipedia "List of largest reservoirs of California", USBR). Scaled so the stepped total
  reaches ~43 MAF statewide (PPIC's "major reservoirs" figure; ~50 MAF for all ~1,500).
- **Storage (validation reference):** CDEC (statewide aggregate only from ~1970); long-term
  avg ~23.5 MAF (USGS Dettinger & Anderson 2015). Pre-1970 statewide storage does not exist.
- **Water use by sector:** Pacific Institute (Cooley 2020) & PPIC (2019), from DWR Bulletin
  160 / California Water Plan. Ag ~25–37 MAF (peak ~1980, flat-declining since); urban ~3.1
  (1960) → 9.3 peak (2007) → 7.0 (2015). Developed split ≈ 80% ag / 20% urban.
- **Per-capita (GPCD):** 177 (1960) → 231 (1990–2007 plateau) → 146 (2015). PPIC / Pacific
  Institute.
- **Population:** CA 10.586M (1950) → 39.538M (2020), flat after (US Census + CA DOF);
  US 151M → 331M (Census).
- **Proposed reservoirs:** California Water Commission / WSIP, project authorities, PPIC.
  PPIC framing: all proposed new storage ≈ 3.3 MAF capacity but only ~0.76 MAF/yr new supply
  (~2% of use). Off-stream projects (Sites, Sisk, Los Vaqueros, Pacheco, Del Puerto) fill only
  from wet-year high flows.
- **Ag/population linkage (for prose, not a modeled channel):** CA supplies ~75%+ of US
  fruits/nuts; ~$23.6B exports (2022); shift to permanent crops (almond acreage 327K→1.24M,
  1980→2020) that can't be fallowed. But ag *water volume* decoupled from population/acreage —
  flat-to-declining 40 years while output value and population rose. So we model ag as a fixed
  real series and discuss the linkage qualitatively.

**Data fallbacks:** where only benchmark years exist (capacity, ag, GPCD, population), linearly
interpolate to annual and label as interpolated in `data.js` comments. Runoff is true annual.

## 7. Limitations (the post's honesty section)

- Single statewide bucket: ignores geography (the Delta, that NorCal water can't freely move
  south), the CVP/SWP split, and Colorado River imports.
- Groundwater is out-of-model: the "supply gap" is in reality met by groundwater overdraft —
  itself the slow-motion crisis (subsidence, SGMA). The gap is best read as "stress / reliance
  on overdraft," not literal taps running dry.
- Snowpack (a huge natural reservoir, ~17 MAF avg April 1) is folded into runoff timing, not
  modeled separately.
- Absolute MAF outputs depend on the `K_INFLOW` calibration; the robust result is the lever
  ranking.
- Ag demand is a smoothed series; real ag use is weather-responsive.

## 8. Out of scope (YAGNI)

- No monthly/daily resolution — annual water years only.
- No separate CVP/SWP or regional modeling.
- No deeper-droughts or snowpack-shift levers (considered, cut to keep scope sane).
- No backend/data API — all series baked into `data.js` as static consts.
