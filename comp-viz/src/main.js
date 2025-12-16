import { Simulation } from "./sim.js";
import { FlowViz } from "./viz.js";
import { HistogramChart, LineChart } from "./charts.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function fmt1(x) {
  return (Math.round(x * 10) / 10).toFixed(1);
}

function setText(id, text) {
  $(id).textContent = text;
}

function clampInt(x, a, b) {
  return Math.max(a, Math.min(b, Math.floor(x)));
}

const ui = {
  sCash: $("s-cash"),
  sEquity: $("s-equity"),
  sMission: $("s-mission"),
  sCulture: $("s-culture"),
  sTolerance: $("s-tolerance"),
  sSpeed: $("s-speed"),
  btnPlay: $("btn-play"),
  btnStep: $("btn-step"),
  btnReset: $("btn-reset"),
};

const flow = new FlowViz($("c-flow"));
const hist = new HistogramChart($("c-hist"));
const outputChart = new LineChart($("c-output"), { maxPoints: 2000 });

let sim = new Simulation({ seed: 1337 });
let playing = false;
let lastMs = performance.now();
let acc = 0;

const START = {
  cash: 70,
  equity: 30,
  mission: 85,
  culture: 85,
  tolerance: 0.9,
  warmupTicks: 100,
};

// Shared tooltip for canvas charts (histogram + output).
const tooltip = document.createElement("div");
tooltip.className = "tooltip";
document.body.appendChild(tooltip);

function showTooltip(clientX, clientY, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = `${clientX + 12}px`;
  tooltip.style.top = `${clientY + 12}px`;
  tooltip.classList.add("show");
}

function hideTooltip() {
  tooltip.classList.remove("show");
}

function readFactorsFromUI() {
  return {
    cash: Number(ui.sCash.value),
    equity: Number(ui.sEquity.value),
    mission: Number(ui.sMission.value),
    culture: Number(ui.sCulture.value),
  };
}

function renderUI() {
  const f = sim.factors;
  setText("v-cash", `${clampInt(f.cash, 0, 100)}`);
  setText("v-equity", `${clampInt(f.equity, 0, 100)}`);
  setText("v-mission", `${clampInt(f.mission, 0, 100)}`);
  setText("v-culture", `${clampInt(f.culture, 0, 100)}`);
  setText("v-coworkers", `${fmt1(f.coworkers)}`);

  setText("v-tolerance", `${fmt1(sim.behavior.fire.k)} (k)`);
  setText("v-speed", `${ui.sSpeed.value}`);
  setText("v-tick", `${sim.tick}`);

  const stats = sim.teamStats();
  setText("pill-headcount", `Headcount: ${stats.headcount}/${sim.roles}`);
  setText("pill-avg-perf", `Avg perf: ${fmt1(stats.avgPerf)}`);
  setText("pill-output", `Total output: ${Math.round(stats.totalOutput)} (×${fmt1(stats.whipMultiplier)})`);
  setText("pill-churn", `Churn/tick: ${stats.churn}`);
}

function syncSimFromUI() {
  sim.setFactors(readFactorsFromUI());
  sim.setFireTolerance(Number(ui.sTolerance.value));
}

function warmStart(ticks) {
  // Advance the simulation without animating churn so we start near steady-state.
  outputChart.points = [];
  for (let i = 0; i < ticks; i++) {
    syncSimFromUI();
    sim.step();
    outputChart.push(sim.teamStats().totalOutput);
  }
}

function doOneTick() {
  syncSimFromUI();
  const delta = sim.step();
  flow.onTick(delta, sim);

  const perfs = sim.employees.map((e) => e.performance);
  hist.draw(perfs);

  const { totalOutput } = sim.teamStats();
  outputChart.push(totalOutput);
  outputChart.draw();

  renderUI();
}

function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastMs) / 1000);
  lastMs = now;

  if (playing) {
    const tps = Number(ui.sSpeed.value);
    const stepDt = 1 / Math.max(1, tps);
    acc += dt;

    // Avoid spiral-of-death: cap ticks per frame.
    const maxTicksThisFrame = 6;
    let ticks = 0;
    while (acc >= stepDt && ticks < maxTicksThisFrame) {
      doOneTick();
      acc -= stepDt;
      ticks += 1;
    }
  }

  // Always repaint flow animation.
  flow.frame(sim);
  requestAnimationFrame(loop);
}

function setPlaying(next) {
  playing = next;
  ui.btnPlay.textContent = playing ? "Pause" : "Play";
}

// Wire sliders
for (const el of [ui.sCash, ui.sEquity, ui.sMission, ui.sCulture]) {
  el.addEventListener("input", () => {
    syncSimFromUI();
    renderUI();
  });
}

ui.sTolerance.addEventListener("input", () => {
  syncSimFromUI();
  renderUI();
});

ui.sSpeed.addEventListener("input", () => renderUI());

ui.btnPlay.addEventListener("click", () => setPlaying(!playing));
ui.btnStep.addEventListener("click", () => {
  setPlaying(false);
  doOneTick();
});
ui.btnReset.addEventListener("click", () => {
  setPlaying(false);
  ui.sCash.value = String(START.cash);
  ui.sEquity.value = String(START.equity);
  ui.sMission.value = String(START.mission);
  ui.sCulture.value = String(START.culture);
  ui.sTolerance.value = String(START.tolerance);
  sim.reset({ seed: 1337 });
  syncSimFromUI();
  warmStart(START.warmupTicks);
  acc = 0;
  flow.sync(sim);
  hist.draw(sim.employees.map((e) => e.performance));
  outputChart.draw();
  renderUI();
});

// Tooltips
const cHist = $("c-hist");
cHist.addEventListener("mousemove", (ev) => {
  const info = hist.hoverInfoAt(ev.offsetX, ev.offsetY);
  if (!info) return hideTooltip();
  const start = Math.round(info.binStart);
  const end = Math.round(info.binEnd);
  const pct = (info.pct * 100).toFixed(1);
  showTooltip(ev.clientX, ev.clientY, `Perf <b>${start}–${end}</b><br>${info.count} people (<b>${pct}%</b>)`);
});
cHist.addEventListener("mouseleave", hideTooltip);

const cOut = $("c-output");
cOut.addEventListener("mousemove", (ev) => {
  const info = outputChart.hoverInfoAt(ev.offsetX, ev.offsetY);
  if (!info) return hideTooltip();
  showTooltip(ev.clientX, ev.clientY, `Output: <b>${Math.round(info.value)}</b>`);
});
cOut.addEventListener("mouseleave", hideTooltip);
// Zoom/pan output chart (X axis only)
cOut.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
    outputChart.zoomX(factor);
    outputChart.draw();
  },
  { passive: false }
);
cOut.addEventListener("dblclick", () => {
  outputChart.resetX();
  outputChart.draw();
});

// Drag to pan X
let isPanningOut = false;
let panStartX = 0;
let panStartOffset = 0;
cOut.addEventListener("mousedown", (ev) => {
  isPanningOut = true;
  panStartX = ev.clientX;
  panStartOffset = outputChart.view.xOffset;
});
window.addEventListener("mousemove", (ev) => {
  if (!isPanningOut) return;
  const rect = cOut.getBoundingClientRect();
  const dx = ev.clientX - panStartX;
  const frac = dx / Math.max(1, rect.width);
  const deltaPoints = -frac * Math.max(1, outputChart.view.window - 1);
  outputChart.view.xOffset = Math.max(0, panStartOffset + deltaPoints);
  outputChart.draw();
});
window.addEventListener("mouseup", () => {
  isPanningOut = false;
});

// Output zoom buttons
const outXIn = document.getElementById("out-x-in");
const outXOut = document.getElementById("out-x-out");
const outXReset = document.getElementById("out-x-reset");
const outFollow = document.getElementById("out-follow");
outXIn?.addEventListener("click", () => {
  outputChart.zoomX(1.25);
  outputChart.draw();
});
outXOut?.addEventListener("click", () => {
  outputChart.zoomX(1 / 1.25);
  outputChart.draw();
});
outXReset?.addEventListener("click", () => {
  outputChart.resetX();
  outputChart.draw();
});
outFollow?.addEventListener("click", () => {
  outputChart.followLatest();
  outputChart.draw();
});

// Hover tooltip on employee dots in the flow viz.
const cFlow = $("c-flow");
cFlow.addEventListener("mousemove", (ev) => {
  const hit = flow.pickAt(ev.offsetX, ev.offsetY, sim);
  if (!hit) {
    flow.setHoverId(null);
    return hideTooltip();
  }
  flow.setHoverId(hit.emp.id);
  const happinessPct = Math.round(hit.happiness01 * 100);
  const perfPct = Math.round(hit.teamPct * 100);
  showTooltip(
    ev.clientX,
    ev.clientY,
    `<b>${hit.emp.name ?? "Employee"}</b><br>` +
      `Happiness: <b>${happinessPct}%</b><br>` +
      `Performance: <b>${Math.round(hit.emp.performance)}</b> (p<b>${perfPct}</b>)`
  );
});
cFlow.addEventListener("mouseleave", () => {
  flow.setHoverId(null);
  hideTooltip();
});

function initialize() {
  // Ensure sliders match requested starting state (even if HTML defaults drift).
  ui.sCash.value = String(START.cash);
  ui.sEquity.value = String(START.equity);
  ui.sMission.value = String(START.mission);
  ui.sCulture.value = String(START.culture);
  ui.sTolerance.value = String(START.tolerance);

  sim.reset({ seed: 1337 });
  syncSimFromUI();
  warmStart(START.warmupTicks);

  // Draw after layout has settled at least one frame (fixes initial blank/grow).
  hist.draw(sim.employees.map((e) => e.performance));
  outputChart.draw();
  flow.sync(sim);
  flow.frame(sim);
  renderUI();
}

requestAnimationFrame(() => {
  initialize();
  requestAnimationFrame(loop);
});


