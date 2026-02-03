import { Simulation } from "./sim.js";
import { FlowViz } from "./viz.js";
import { LineChart } from "./charts.js";

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
  sSpeed: $("s-speed"),
  btnPlay: $("btn-play"),
  btnReset: $("btn-reset"),
};

const flow = new FlowViz($("c-flow"));
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
  warmupTicks: 100,
};

// Tooltip
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

  const stats = sim.teamStats();
  setText("pill-headcount", `Headcount: ${stats.headcount}/${sim.roles}`);
  setText("pill-avg-perf", `Avg perf: ${fmt1(stats.avgPerf)}`);
  setText("pill-output", `Output: ${Math.round(stats.totalOutput)} (×${fmt1(stats.whipMultiplier)})`);
  setText("pill-churn", `Churn/tick: ${stats.churn}`);
}

function syncSimFromUI() {
  sim.setFactors(readFactorsFromUI());
}

function warmStart(ticks) {
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

    const maxTicksThisFrame = 6;
    let ticks = 0;
    while (acc >= stepDt && ticks < maxTicksThisFrame) {
      doOneTick();
      acc -= stepDt;
      ticks += 1;
    }
  }

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

ui.btnPlay.addEventListener("click", () => setPlaying(!playing));
ui.btnReset.addEventListener("click", () => {
  setPlaying(false);
  ui.sCash.value = String(START.cash);
  ui.sEquity.value = String(START.equity);
  ui.sMission.value = String(START.mission);
  ui.sCulture.value = String(START.culture);
  sim.reset({ seed: 1337 });
  syncSimFromUI();
  warmStart(START.warmupTicks);
  acc = 0;
  flow.sync(sim);
  outputChart.draw();
  renderUI();
});

// Tooltip on flow viz dots
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

// Tooltip on output chart
const cOut = $("c-output");
cOut.addEventListener("mousemove", (ev) => {
  const info = outputChart.hoverInfoAt(ev.offsetX, ev.offsetY);
  if (!info) return hideTooltip();
  showTooltip(ev.clientX, ev.clientY, `Output: <b>${Math.round(info.value)}</b>`);
});
cOut.addEventListener("mouseleave", hideTooltip);

function initialize() {
  ui.sCash.value = String(START.cash);
  ui.sEquity.value = String(START.equity);
  ui.sMission.value = String(START.mission);
  ui.sCulture.value = String(START.culture);

  sim.reset({ seed: 1337 });
  syncSimFromUI();
  warmStart(START.warmupTicks);

  outputChart.draw();
  flow.sync(sim);
  flow.frame(sim);
  renderUI();
}

requestAnimationFrame(() => {
  initialize();
  requestAnimationFrame(loop);
});
