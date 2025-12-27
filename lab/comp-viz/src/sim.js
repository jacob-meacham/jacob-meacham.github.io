import { clamp, mulberry32, normalClamped, mean, stddev } from "./util.js";

const FACTORS = ["cash", "equity", "mission", "culture", "coworkers"];

const FIRST_NAMES = [
  "Alex","Avery","Blake","Casey","Charlie","Dakota","Drew","Eden","Elliot","Emerson",
  "Finley","Harper","Hayden","Jamie","Jordan","Kai","Logan","Morgan","Parker","Quinn",
  "Reese","Riley","Robin","Rowan","Sam","Sawyer","Shawn","Sidney","Skyler","Taylor",
];
const LAST_NAMES = [
  "Chen","Patel","Nguyen","Kim","Garcia","Rodriguez","Singh","Khan","Lee","Brown",
  "Johnson","Williams","Martinez","Davis","Miller","Wilson","Moore","Anderson","Taylor","Thomas",
  "Jackson","White","Harris","Martin","Thompson","Young","Allen","King","Wright","Scott",
];

function randomName(rng) {
  const f = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

function probFromGap01(gap01, { base = 0, max = 1, exponent = 1.6 } = {}) {
  const g = clamp(gap01, 0, 1);
  const t = Math.pow(g, exponent);
  return clamp(base + (max - base) * t, 0, 1);
}

function probUnion(pA, pB) {
  // Probability of A or B happening (assuming independent-ish).
  const a = clamp(pA, 0, 1);
  const b = clamp(pB, 0, 1);
  return 1 - (1 - a) * (1 - b);
}

function randomWeights(rng) {
  // Sample 5 positive numbers, normalize to sum=1.
  const raw = [];
  let s = 0;
  for (let i = 0; i < FACTORS.length; i++) {
    // Avoid near-zero with a +epsilon.
    const x = Math.pow(rng(), 0.65) + 0.02;
    raw.push(x);
    s += x;
  }
  return raw.map((x) => x / s);
}

export class Simulation {
  constructor({
    seed = 1337,
    roles = 1000,
    perfMean = 50,
    perfStd = 15,
    perfMin = 0,
    perfMax = 100,
    behavior = {},
  } = {}) {
    this.roles = roles;
    this.perfMean = perfMean;
    this.perfStd = perfStd;
    this.perfMin = perfMin;
    this.perfMax = perfMax;

    // How quickly the world reacts when it’s in a “wrong” state.
    // (Hazard-style probabilities: closer to wrong => small chance; far wrong => big chance.)
    const defaultBehavior = {
      leave: {
        // Baseline "life happens" churn (even if comp is great), increasing with tenure.
        baseHappy: 0.001,
        tenureScale: 0.00025,
        tenureExponent: 0.7,
        tenureMax: 0.06,

        base: 0.02,
        max: 0.85,
        exponent: 1.75,
        perfBoost: 0.55, // higher performers have more outside options
      },
      fire: {
        base: 0.02,
        max: 0.65,
        exponent: 1.8,
        k: 0.9, // firing bar: avg - k*sd (tighter => more visible firings)
        sdFloor: 8,
        maxFireFraction: 0.06, // safety cap per tick
      },
      hire: {
        baseIntensity: 0.08, // fraction of open roles we *attempt* to fill each tick
        urgencyIntensity: 1.35, // grows with open fraction (distance from desired state)
        maxFillFraction: 0.3, // cap: fill <= 30% of roles per tick
        sampleSize: 18, // candidates sampled per hire attempt (imperfect hiring keeps a distribution)
      },
      whip: {
        // "Crack the whip" effect from work/life balance:
        // culture=100 => +0.0σ shift (natural output)
        // culture=0 => +1.0σ shift (max whip)
        maxSigmaShift: 0.5,
        exponent: 1.35,
      },
      productivity: {
        // Non-linear natural output curve: output ~ exp(beta * z).
        // z is employee standard deviations from perfMean (i.e. (perf - mean)/std).
        // This makes 75th percentile meaningfully stronger than 50th.
        beta: 1.35,
        baseOutputAtZ0: 50,
      },
    };

    this.behavior = {
      leave: { ...defaultBehavior.leave, ...(behavior.leave || {}) },
      fire: { ...defaultBehavior.fire, ...(behavior.fire || {}) },
      hire: { ...defaultBehavior.hire, ...(behavior.hire || {}) },
      whip: { ...defaultBehavior.whip, ...(behavior.whip || {}) },
      productivity: { ...defaultBehavior.productivity, ...(behavior.productivity || {}) },
    };

    this._seed = seed >>> 0;
    this._rng = mulberry32(this._seed);

    this.tick = 0;
    this.factors = {
      cash: 70,
      equity: 30,
      mission: 85,
      culture: 85,
      coworkers: 55, // emergent (updated each tick)
    };

    this._lastChurn = 0;
    this._lastNewHires = 0;
    this._employees = [];
    this._freeSlots = [];
    for (let i = 0; i < this.roles; i++) this._freeSlots.push(i);

    // Seed the company initially.
    this._seedCompany();
    this._recomputeEmergentCoworkers();
  }

  reset({ seed } = {}) {
    if (typeof seed === "number") this._seed = seed >>> 0;
    this._rng = mulberry32(this._seed);
    this.tick = 0;
    this._employees = [];
    this._freeSlots = [];
    for (let i = 0; i < this.roles; i++) this._freeSlots.push(i);
    this._lastChurn = 0;
    this._lastNewHires = 0;
    this.factors.coworkers = 55;
    this._seedCompany();
    this._recomputeEmergentCoworkers();
  }

  setFactors(partial) {
    for (const k of ["cash", "equity", "mission", "culture"]) {
      if (typeof partial[k] === "number") this.factors[k] = clamp(partial[k], 0, 100);
    }
  }

  setFireTolerance(k) {
    // k is used as: threshold = avg - k*sdEff. Higher k => lower threshold => more tolerant.
    if (typeof k !== "number" || Number.isNaN(k)) return;
    this.behavior.fire.k = clamp(k, 0.1, 3.0);
  }

  get employees() {
    return this._employees;
  }

  // Weighted total comp, in the same 0..100 space as performance.
  totalCompFor(emp) {
    const f = this.factors;
    const w = emp.weights;
    return (
      w[0] * f.cash +
      w[1] * f.equity +
      w[2] * f.mission +
      w[3] * f.culture +
      w[4] * f.coworkers
    );
  }

  whipMultiplier() {
    // Use culture as a proxy for work/life balance (0..100).
    // Lower culture => more whip => at most +1σ shift along the talent curve.
    const wl01 = clamp(this.factors.culture / 100, 0, 1);
    const intensity = 1 - wl01;
    const sigmaShift =
      (this.behavior.whip?.maxSigmaShift ?? 1) *
      Math.pow(intensity, this.behavior.whip?.exponent ?? 1);
    const shiftClamped = clamp(sigmaShift, 0, this.behavior.whip?.maxSigmaShift ?? 1);
    const beta = this.behavior.productivity?.beta ?? 1;
    // Output multiplier implied by shifting z by +shiftClamped.
    return Math.exp(beta * shiftClamped);
  }

  naturalOutputFor(emp) {
    const beta = this.behavior.productivity?.beta ?? 1;
    const base = this.behavior.productivity?.baseOutputAtZ0 ?? 50;
    const z = Number.isFinite(emp.z) ? emp.z : (emp.performance - this.perfMean) / Math.max(1e-6, this.perfStd);
    // Normalize so that E[exp(beta*z - beta^2/2)] = 1 for z~N(0,1),
    // so baseOutputAtZ0 is also approximately the *mean* output per employee.
    return base * Math.exp(beta * z - (beta * beta) / 2);
  }

  effectiveOutputFor(emp) {
    return this.naturalOutputFor(emp) * this.whipMultiplier();
  }

  // Ratio > 1 = surplus comp; < 1 = shortfall. Clamp for visuals.
  compRatioFor(emp) {
    const required = Math.max(1e-6, emp.performance);
    return this.totalCompFor(emp) / required;
  }

  happiness01For(emp) {
    // Map ratio ~[0.6..1.4] -> [0..1], clamp.
    const r = this.compRatioFor(emp);
    return clamp((r - 0.6) / 0.8, 0, 1);
  }

  teamStats() {
    const perfs = this._employees.map((e) => e.performance);
    const avg = mean(perfs);
    const sd = stddev(perfs);
    const output = this._employees.reduce((s, e) => s + this.effectiveOutputFor(e), 0);
    return {
      tick: this.tick,
      headcount: this._employees.length,
      openRoles: this.roles - this._employees.length,
      avgPerf: avg,
      stdPerf: sd,
      totalOutput: output,
      whipMultiplier: this.whipMultiplier(),
      churn: this._lastChurn,
      newHires: this._lastNewHires,
      coworkers: this.factors.coworkers,
    };
  }

  step() {
    this.tick += 1;

    // 1) Voluntary exits (probabilistic hazard when comp < requirement).
    const stillHere = [];
    const exits = [];
    for (const emp of this._employees) {
      const tenure = emp.tenure ?? 0;
      const pTenure = clamp(
        (this.behavior.leave.tenureScale ?? 0) *
          Math.pow(tenure, this.behavior.leave.tenureExponent ?? 1),
        0,
        this.behavior.leave.tenureMax ?? 1
      );
      const pBackground = clamp((this.behavior.leave.baseHappy ?? 0) + pTenure, 0, 1);

      const comp = this.totalCompFor(emp);
      const ok = comp >= emp.performance;
      if (ok) {
        if (this._rng() < pBackground) exits.push(emp);
        else {
          emp.tenure = tenure + 1;
          stillHere.push(emp);
        }
        continue;
      }

      // Gap in required terms: (perf - comp)/perf.
      const shortfall01 = clamp((emp.performance - comp) / Math.max(1e-6, emp.performance), 0, 1);
      const perf01 = clamp(emp.performance / 100, 0, 1);
      const boostedGap = clamp(shortfall01 * (1 + this.behavior.leave.perfBoost * perf01), 0, 1);
      const pLeave = probFromGap01(boostedGap, this.behavior.leave);
      const pTotal = probUnion(pBackground, pLeave);
      if (this._rng() < pTotal) exits.push(emp);
      else {
        emp.tenure = tenure + 1;
        stillHere.push(emp);
      }
    }
    this._employees = stillHere;
    for (const emp of exits) this._freeSlots.push(emp.slot);

    // 2) Hire to refill roles (probabilistic delay; fills a fraction of open roles each tick).
    const open = this.roles - this._employees.length;
    this._lastNewHires = 0;
    let hired = [];
    if (open > 0) {
      hired = this._hireSome(open);
      this._employees.push(...hired);
      this._lastNewHires = hired.length;
    }

    // 3) Fire underperformers (probabilistic hazard below bar), evaluated *after* hiring
    // so the bar reflects the current team composition.
    const perfs = this._employees.map((e) => e.performance);
    const avg = mean(perfs);
    const sd = stddev(perfs);
    const k = this.behavior.fire.k;
    const sdEff = Math.max(sd, this.behavior.fire.sdFloor);
    const threshold = avg - k * sdEff;
    const maxToFire = Math.floor(this.behavior.fire.maxFireFraction * this.roles);
    let fired = [];
    if (this._employees.length) {
      for (const emp of this._employees) {
        if (emp.performance >= threshold) continue;
        const gapZ = (threshold - emp.performance) / sdEff; // ~0..inf
        const gap01 = clamp(gapZ / 2.5, 0, 1);
        const pFire = probFromGap01(gap01, this.behavior.fire);
        if (this._rng() < pFire) fired.push(emp);
      }

      // Safety cap: if too many, only fire the worst.
      if (fired.length > maxToFire) {
        fired.sort((a, b) => a.performance - b.performance);
        fired = fired.slice(0, maxToFire);
      }
    }
    if (fired.length) {
      const firedSet = new Set(fired.map((e) => e.id));
      const remain = [];
      for (const emp of this._employees) {
        if (firedSet.has(emp.id)) this._freeSlots.push(emp.slot);
        else remain.push(emp);
      }
      this._employees = remain;
    }

    // 4) Update emergent coworker factor (depends on performance + churn).
    this._lastChurn = exits.length + fired.length;
    this._recomputeEmergentCoworkers();

    return { exits, fired, hired };
  }

  _newEmployee(slot) {
    const performance = normalClamped(this._rng, this.perfMean, this.perfStd, this.perfMin, this.perfMax);
    return {
      id: `${this.tick}-${slot}-${Math.floor(this._rng() * 1e9)}`,
      slot,
      performance,
      z: (performance - this.perfMean) / Math.max(1e-6, this.perfStd),
      name: randomName(this._rng),
      weights: randomWeights(this._rng),
      tenure: 0,
      // Visualization state:
      _viz: null,
    };
  }

  _hireToFill() {
    const open = this.roles - this._employees.length;
    if (open <= 0) return;
    const hired = this._hire(open, { sampleSize: 18 });
    this._employees.push(...hired);
    this._lastNewHires = hired.length;
  }

  _seedCompany() {
    // For the initial state we want a full team immediately (so the viz is interesting on load),
    // even if later hiring is delayed.
    this._hireToFill();
  }

  _hire(open, { sampleSize } = {}) {
    // Hire "best of a small sample" per opening (models limited hiring bandwidth / noisy matching),
    // which prevents the team distribution from collapsing to a near-single value.
    const n = Math.max(3, Math.floor(sampleSize ?? this.behavior.hire.sampleSize));
    const hired = [];

    while (hired.length < open && this._freeSlots.length) {
      let chosen = this._bestAcceptingCandidateFromSample(n);
      if (!chosen) {
        // If no acceptors in this sample (very low comp), force-hire a low performer so we still
        // keep roles filled in the toy world.
        chosen = this._newEmployee(-1);
        chosen.performance = clamp(
          Math.min(chosen.performance, this._maxAcceptablePerfUnderCurrentComp()),
          0,
          100
        );
      }
      chosen.slot = this._freeSlots.pop();
      hired.push(chosen);
    }
    return hired;
  }

  _hireSome(open) {
    const openFrac = clamp(open / this.roles, 0, 1);
    const intensity = clamp(
      this.behavior.hire.baseIntensity + this.behavior.hire.urgencyIntensity * openFrac,
      0,
      3
    );
    const maxFill = Math.max(1, Math.floor(this.behavior.hire.maxFillFraction * this.roles));
    const attempts = Math.min(open, maxFill, Math.max(1, Math.ceil(open * intensity)));

    const hires = [];
    for (let a = 0; a < attempts && this._freeSlots.length; a++) {
      const chosen = this._bestAcceptingCandidateFromSample(this.behavior.hire.sampleSize);
      if (!chosen) continue; // no one accepts this tick for this attempt -> delay
      chosen.slot = this._freeSlots.pop();
      hires.push(chosen);
    }
    return hires;
  }

  _bestAcceptingCandidateFromSample(sampleSize) {
    let best = null;
    for (let i = 0; i < sampleSize; i++) {
      const c = this._newEmployee(-1);
      const accept = this.totalCompFor(c) >= c.performance;
      if (!accept) continue;
      if (!best || c.performance > best.performance) best = c;
    }
    return best;
  }

  _maxAcceptablePerfUnderCurrentComp() {
    // “Average” candidate who weights everything equally: conservative bound.
    const f = this.factors;
    return (f.cash + f.equity + f.mission + f.culture + f.coworkers) / 5;
  }

  _recomputeEmergentCoworkers() {
    const stats = this.teamStats();
    const churnRate = clamp(stats.churn / this.roles, 0, 1);
    const avgPerf01 = clamp(stats.avgPerf / 100, 0, 1);
    const stability01 = clamp(1 - stats.newHires / this.roles, 0, 1);

    // Strong + stable teams make coworkers “great”; churn drags it down.
    const coworkers01 =
      0.58 * avgPerf01 +
      0.28 * stability01 +
      0.22 * (1 - churnRate);
    const target = clamp(coworkers01, 0, 1) * 100;

    // Smooth it so it doesn’t whiplash.
    this.factors.coworkers = clamp(this.factors.coworkers * 0.85 + target * 0.15, 0, 100);
  }
}

export { FACTORS };


