import { clamp, lerp, easeOutCubic, mixColorRgb, normCdf } from "./util.js";

const GOOD = [50, 213, 131];
const BAD = [249, 112, 102];

function happinessColor01(h01) {
  const t = clamp(h01, 0, 1);
  return mixColorRgb(BAD, GOOD, t);
}

export class FlowViz {
  constructor(canvas, { cols = 50, rows = 20 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cols = cols;
    this.rows = rows;

    this._now = performance.now();
    this._entities = new Map(); // emp.id -> vizState
    this._exiting = []; // vizState
    this._hoverId = null;

    this._layout = null;
    this._recomputeLayout();

    // Subtle “milling” motion parameters (bounded within each slot cell).
    this._milling = {
      // Ornstein–Uhlenbeck-ish brownian motion around 0.
      theta: 3.2, // pullback strength
      sigma: 22, // noise strength (px/s^1.5-ish; tuned with sqrt(dt))
      maxV: 34, // px/s
    };

    // Animation pacing for hires/leavers.
    this._anim = {
      enterMs: 5000,
      exitMs: 5000,
    };

    const ro = new ResizeObserver(() => this._handleResize());
    ro.observe(canvas);
    this._ro = ro;

    this._lastFrameMs = performance.now();
  }

  setHoverId(id) {
    this._hoverId = id;
  }

  pickAt(x, y, sim) {
    // Hit test against drawn dots. Returns { emp, x, y, rOuter, happiness01, teamPct } or null.
    if (!this._layout) return null;
    let best = null;
    let bestR = -Infinity;

    for (const emp of sim.employees) {
      const st = this._entities.get(emp.id);
      if (!st) continue;
      const dx = st.x + (st.jx ?? 0);
      const dy = st.y + (st.jy ?? 0);
      const perf = emp.performance;
      const rOuter = 1.7 + (perf / 100) * 4.0;
      const rr = (rOuter + 2) * (rOuter + 2);
      const dd = (x - dx) * (x - dx) + (y - dy) * (y - dy);
      if (dd <= rr && rOuter > bestR) {
        const h01 = sim.happiness01For(emp);
        const z = st._teamZ ?? 0;
        const pct = clamp(normCdf(z), 0, 1);
        best = { emp, x: dx, y: dy, rOuter, happiness01: h01, teamPct: pct };
        bestR = rOuter;
      }
    }
    return best;
  }

  // Populate the visualization with the current employee roster (no enter animation).
  sync(sim) {
    this._handleResize();
    this._entities.clear();
    this._exiting = [];
    const t = performance.now();
    for (const emp of sim.employees) {
      const { x, y } = this._slotXY(emp.slot);
      const st = {
        id: emp.id,
        slot: emp.slot,
        x,
        y,
        x0: x,
        y0: y,
        x1: x,
        y1: y,
        t0: t,
        t1: t,
        alpha0: 1,
        alpha1: 1,
        alpha: 1,
        // Milling state (brownian-ish)
        jx: (Math.random() - 0.5) * 10,
        jy: (Math.random() - 0.5) * 10,
        jvx: (Math.random() - 0.5) * 14,
        jvy: (Math.random() - 0.5) * 14,
        mode: "stay",
      };
      this._entities.set(emp.id, st);
    }
  }

  destroy() {
    try {
      this._ro?.disconnect();
    } catch (_) {
      // ignore
    }
  }

  _handleResize() {
    // Keep canvas backing buffer sized to CSS pixels for crispness.
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    // Always keep the transform/layout up to date (even if backing size didn't change).
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._recomputeLayout();
  }

  _recomputeLayout() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.width;
    const h = rect.height || this.canvas.height;

    const pad = 18;
    const band = Math.max(90, Math.floor(w * 0.14));
    const company = {
      x: pad + band,
      y: pad,
      w: w - pad * 2 - band * 2,
      h: h - pad * 2,
    };

    const slotW = company.w / this.cols;
    const slotH = company.h / this.rows;

    this._layout = { w, h, pad, band, company, slotW, slotH };
  }

  _slotXY(slot) {
    const { company, slotW, slotH } = this._layout;
    const c = slot % this.cols;
    const r = Math.floor(slot / this.cols) % this.rows;
    const x = company.x + (c + 0.5) * slotW;
    const y = company.y + (r + 0.5) * slotH;
    return { x, y };
  }

  onTick(delta, sim) {
    // delta: { exits, fired, hired }
    const t = this._now;

    // Mark exits/fires.
    const leaving = [...(delta.exits || []), ...(delta.fired || [])];
    for (const emp of leaving) {
      const st = this._entities.get(emp.id);
      if (!st) continue;
      st.mode = delta.fired?.some((e) => e.id === emp.id) ? "fired" : "exit";
      st.t0 = t;
      st.t1 = t + this._anim.exitMs;
      st.x0 = st.x;
      st.y0 = st.y;
      st.x1 = this._layout.w + 50;
      st.y1 = st.y + (Math.random() * 14 - 7);
      st.alpha0 = 1;
      st.alpha1 = 0;
      this._exiting.push(st);
      this._entities.delete(emp.id);
    }

    // Add hires.
    for (const emp of delta.hired || []) {
      const { x, y } = this._slotXY(emp.slot);
      const yJitter = (Math.random() - 0.5) * 10;
      const st = {
        id: emp.id,
        slot: emp.slot,
        x,
        y,
        x0: -50,
        y0: y + yJitter,
        x1: x,
        y1: y,
        t0: t,
        t1: t + this._anim.enterMs,
        alpha0: 0,
        alpha1: 1,
        // Milling state (brownian-ish)
        jx: (Math.random() - 0.5) * 10,
        jy: (Math.random() - 0.5) * 10,
        jvx: (Math.random() - 0.5) * 14,
        jvy: (Math.random() - 0.5) * 14,
        mode: "enter",
      };
      st.x = st.x0;
      st.y = st.y0;
      st.alpha = st.alpha0;
      this._entities.set(emp.id, st);
    }

    // Update slot assignment for existing employees (slots should be stable, but keep in sync).
    for (const emp of sim.employees) {
      const st = this._entities.get(emp.id);
      if (!st) continue;
      if (st.slot !== emp.slot) {
        st.slot = emp.slot;
      }
    }
  }

  frame(sim) {
    const ctx = this.ctx;
    this._now = performance.now();
    const dt = clamp((this._now - (this._lastFrameMs ?? this._now)) / 1000, 0, 0.05);
    this._lastFrameMs = this._now;
    this._handleResize();
    const { w, h, pad, band, company } = this._layout;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(5,10,18,.65)";
    ctx.fillRect(0, 0, w, h);

    // Regions
    ctx.fillStyle = "rgba(255,255,255,.03)";
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;

    // Left attract band
    ctx.fillRect(pad, pad, band, h - pad * 2);
    ctx.strokeRect(pad, pad, band, h - pad * 2);

    // Company
    ctx.fillRect(company.x, company.y, company.w, company.h);
    ctx.strokeRect(company.x, company.y, company.w, company.h);

    // Right exit band
    ctx.fillRect(company.x + company.w, pad, band, h - pad * 2);
    ctx.strokeRect(company.x + company.w, pad, band, h - pad * 2);

    // Labels
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText("Candidates", pad + 10, pad + 18);
    ctx.fillText("Company", company.x + 10, pad + 18);
    ctx.fillText("Exits", company.x + company.w + 10, pad + 18);

    // Animate existing dots toward their slots.
    const limX = Math.max(2, this._layout.slotW * 0.35);
    const limY = Math.max(2, this._layout.slotH * 0.35);

    // Team stats for "relative" sizing.
    let teamAvg = 0;
    let teamVar = 0;
    const nTeam = sim.employees.length || 1;
    for (const emp of sim.employees) teamAvg += emp.performance;
    teamAvg /= nTeam;
    for (const emp of sim.employees) {
      const d = emp.performance - teamAvg;
      teamVar += d * d;
    }
    teamVar /= nTeam;
    const teamSd = Math.max(1e-6, Math.sqrt(teamVar));

    for (const emp of sim.employees) {
      const st = this._entities.get(emp.id);
      if (!st) continue;

      const { x: tx, y: ty } = this._slotXY(emp.slot);
      st.x = lerp(st.x, tx, 0.18);
      st.y = lerp(st.y, ty, 0.18);
      st.alpha = lerp(st.alpha ?? 1, 1, 0.12);

      // Milling around: brownian-ish random walk with pullback toward center.
      // Use a roughly-normal-ish noise from (rand-0.5) scaled.
      const n1 = (Math.random() - 0.5) * 2;
      const n2 = (Math.random() - 0.5) * 2;
      const theta = this._milling.theta;
      const sigma = this._milling.sigma;
      st.jvx = (st.jvx ?? 0) + (-theta * (st.jx ?? 0)) * dt + sigma * Math.sqrt(dt) * n1;
      st.jvy = (st.jvy ?? 0) + (-theta * (st.jy ?? 0)) * dt + sigma * Math.sqrt(dt) * n2;
      st.jvx = clamp(st.jvx, -this._milling.maxV, this._milling.maxV);
      st.jvy = clamp(st.jvy, -this._milling.maxV, this._milling.maxV);
      st.jx = (st.jx ?? 0) + st.jvx * dt;
      st.jy = (st.jy ?? 0) + st.jvy * dt;
      // Reflect at bounds
      if (st.jx > limX) {
        st.jx = limX;
        st.jvx *= -0.6;
      } else if (st.jx < -limX) {
        st.jx = -limX;
        st.jvx *= -0.6;
      }
      if (st.jy > limY) {
        st.jy = limY;
        st.jvy *= -0.6;
      } else if (st.jy < -limY) {
        st.jy = -limY;
        st.jvy *= -0.6;
      }

      // Relative performance vs team (store for draw loop).
      const z = (emp.performance - teamAvg) / teamSd;
      st._teamZ = z;
      st._rel01 = clamp(0.5 + 0.18 * z, 0.2, 0.9);
    }

    // Animate entering/exiting based on t0/t1.
    const now = this._now;
    const all = [];
    for (const st of this._entities.values()) all.push(st);
    for (const st of this._exiting) all.push(st);

    for (const st of all) {
      if (!st.t0 || !st.t1) continue;
      const u = clamp((now - st.t0) / (st.t1 - st.t0), 0, 1);
      const e = easeOutCubic(u);
      st.x = lerp(st.x0, st.x1, e);
      st.y = lerp(st.y0, st.y1, e);
      st.alpha = lerp(st.alpha0, st.alpha1, e);
    }

    // Cull finished exit animations.
    this._exiting = this._exiting.filter((st) => now < st.t1);

    // Draw dots (sort by size so big ones sit on top).
    const drawList = [];
    for (const emp of sim.employees) {
      const st = this._entities.get(emp.id);
      if (st) drawList.push({ emp, st });
    }
    // Exiting dots: we don’t have emp data anymore, so store minimal color/size snapshot.
    for (const st of this._exiting) drawList.push({ emp: null, st });

    drawList.sort((a, b) => (a.emp?.performance ?? 0) - (b.emp?.performance ?? 0));

    for (const item of drawList) {
      const { emp, st } = item;
      const perf = emp ? emp.performance : st._perf ?? 30;
      // Outer radius: global/absolute performance.
      const rOuter = 1.7 + (perf / 100) * 4.0;
      // Inner radius: relative to current team (z-score mapped to [0.2..0.9] of outer).
      const rel01 = emp ? st._rel01 ?? 0.5 : 0.5;
      const rInner = clamp(rOuter * rel01, 1.1, rOuter - 0.6);
      const alpha = clamp(st.alpha ?? 1, 0, 1);

      let fill = "rgba(255,255,255,.2)";
      if (emp) {
        const h01 = sim.happiness01For(emp);
        fill = happinessColor01(h01);
        // Snapshot for exits.
        st._perf = perf;
        st._fill = fill;
      } else if (st._fill) {
        fill = st._fill;
      }

      ctx.globalAlpha = alpha;
      const dx = st.x + (st.jx ?? 0);
      const dy = st.y + (st.jy ?? 0);

      // Outer halo (absolute)
      ctx.beginPath();
      ctx.arc(dx, dy, rOuter, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha * 0.55;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.22)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner core (relative-to-team)
      ctx.beginPath();
      ctx.arc(dx, dy, rInner, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.28)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Hover highlight (bounding box)
    if (this._hoverId) {
      const st = this._entities.get(this._hoverId);
      if (st) {
        const emp = sim.employees.find((e) => e.id === this._hoverId);
        const perf = emp ? emp.performance : 50;
        const rOuter = 1.7 + (perf / 100) * 4.0;
        const dx = st.x + (st.jx ?? 0);
        const dy = st.y + (st.jy ?? 0);
        const padBox = 3;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(dx - rOuter - padBox, dy - rOuter - padBox, (rOuter + padBox) * 2, (rOuter + padBox) * 2);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}


