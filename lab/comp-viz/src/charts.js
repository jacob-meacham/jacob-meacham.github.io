import { clamp } from "./util.js";

function resizeCanvasToCssPixels(canvas, ctx) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (w && h && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { w: rect.width, h: rect.height };
}

export class HistogramChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bins = 20;
    this._last = {
      perfs: [],
      counts: [],
      total: 0,
      pad: 26,
      w: 0,
      h: 0,
      innerW: 0,
      innerH: 0,
      binW: 0,
    };
    this._ro = new ResizeObserver(() => this.draw([]));
    this._ro.observe(canvas);
  }

  draw(perfs) {
    const ctx = this.ctx;
    const { w, h } = resizeCanvasToCssPixels(this.canvas, ctx);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(5,10,18,.55)";
    ctx.fillRect(0, 0, w, h);

    const pad = 26;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, innerW, innerH);

    const bins = this.bins;
    const counts = new Array(bins).fill(0);
    for (const p of perfs) {
      const b = clamp(Math.floor((p / 100) * bins), 0, bins - 1);
      counts[b] += 1;
    }
    const maxC = Math.max(1, ...counts);

    const bw = innerW / bins;
    for (let i = 0; i < bins; i++) {
      const frac = counts[i] / maxC;
      const bh = frac * innerH;
      const x = pad + i * bw;
      const y = pad + (innerH - bh);

      ctx.fillStyle = "rgba(34,211,238,.28)";
      ctx.fillRect(x + 1, y, bw - 2, bh);
      ctx.fillStyle = "rgba(255,255,255,.45)";
    }

    // Labels
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText("0", pad - 6, pad + innerH + 16);
    ctx.fillText("100", pad + innerW - 22, pad + innerH + 16);
    ctx.fillText("perf", pad + innerW - 30, pad - 8);

    this._last = {
      perfs,
      counts,
      total: perfs.length || 0,
      pad,
      w,
      h,
      innerW,
      innerH,
      binW: bw,
    };
  }

  hoverInfoAt(x, y) {
    const L = this._last;
    if (!L || !L.innerW || !L.innerH) return null;
    if (x < L.pad || x > L.pad + L.innerW || y < L.pad || y > L.pad + L.innerH) return null;

    const b = clamp(Math.floor((x - L.pad) / L.binW), 0, this.bins - 1);
    const count = L.counts[b] ?? 0;
    const pct = L.total ? count / L.total : 0;
    const binStart = (b / this.bins) * 100;
    const binEnd = ((b + 1) / this.bins) * 100;
    return { bin: b, binStart, binEnd, count, pct };
  }
}

export class LineChart {
  constructor(canvas, { maxPoints = 240 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maxPoints = maxPoints;
    this.points = [];
    this.view = {
      // Window of points to display on X axis (lets zoom show more history).
      baseWindow: Math.min(260, maxPoints),
      window: Math.min(260, maxPoints),
      xZoom: 1, // >1 shows fewer points (zoom in), <1 shows more points (zoom out)
      xOffset: 0, // how many points back from the latest to end the window
    };
    this._last = {
      pad: 26,
      w: 0,
      h: 0,
      innerW: 0,
      innerH: 0,
      minY: 0,
      maxY: 1,
      startIdx: 0,
      endIdx: 0,
    };
    this._ro = new ResizeObserver(() => this.draw());
    this._ro.observe(canvas);
  }

  push(y) {
    this.points.push(y);
    if (this.points.length > this.maxPoints) this.points.shift();
  }

  resetX() {
    this.view.xZoom = 1;
    this.view.window = this.view.baseWindow;
    this.view.xOffset = 0;
  }

  zoomX(factor) {
    const f = clamp(factor, 0.2, 5);
    const oldWindow = this.view.window;
    this.view.xZoom = clamp(this.view.xZoom * f, 0.25, 12);
    this.view.window = clamp(
      Math.round(this.view.baseWindow / this.view.xZoom),
      40,
      this.maxPoints
    );

    // Keep the center time approximately stable when zooming.
    const oldCenterFromEnd = this.view.xOffset + Math.floor(oldWindow / 2);
    const newOffset = Math.max(0, Math.round(oldCenterFromEnd - this.view.window / 2));
    this.view.xOffset = newOffset;
  }

  panX(deltaPoints) {
    this.view.xOffset = Math.max(0, Math.round(this.view.xOffset + deltaPoints));
  }

  followLatest() {
    this.view.xOffset = 0;
  }

  draw() {
    const ctx = this.ctx;
    const { w, h } = resizeCanvasToCssPixels(this.canvas, ctx);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(5,10,18,.55)";
    ctx.fillRect(0, 0, w, h);

    const pad = 26;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, innerW, innerH);

    if (this.points.length < 2) return;

    // Visible slice (we keep all points; chart draws the current buffer).
    const endIdx = Math.max(0, this.points.length - 1 - Math.floor(this.view.xOffset));
    const startIdx = Math.max(0, endIdx - (this.view.window - 1));
    const visibleCount = endIdx - startIdx + 1;

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = startIdx; i <= endIdx; i++) {
      const y = this.points[i];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    // Gridlines
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const yy = pad + (innerH * i) / 4;
      ctx.moveTo(pad, yy);
      ctx.lineTo(pad + innerW, yy);
    }
    ctx.stroke();

    // Line (clip to plot area so zooming never draws outside the box)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, innerW, innerH);
    ctx.clip();

    ctx.strokeStyle = "rgba(50,213,131,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j < visibleCount; j++) {
      const i = startIdx + j;
      const x = pad + (innerW * j) / Math.max(1, visibleCount - 1);
      const y01 = clamp((this.points[i] - minY) / (maxY - minY), 0, 1);
      const y = pad + innerH * (1 - y01);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Labels
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText(`${Math.round(maxY)}`, pad + 4, pad + 12);
    ctx.fillText(`${Math.round(minY)}`, pad + 4, pad + innerH - 6);

    this._last = { pad, w, h, innerW, innerH, minY, maxY, startIdx, endIdx };
  }

  hoverInfoAt(x, y) {
    const L = this._last;
    if (!L || this.points.length < 2) return null;
    if (x < L.pad || x > L.pad + L.innerW || y < L.pad || y > L.pad + L.innerH) return null;

    const n = L.endIdx - L.startIdx + 1;
    const t = clamp((x - L.pad) / L.innerW, 0, 1);
    const j = clamp(Math.round(t * (n - 1)), 0, n - 1);
    const idx = L.startIdx + j;
    const value = this.points[idx];
    return { idx, value };
  }
}


