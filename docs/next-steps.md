# Next steps

Running list of performance/site follow-ups.

## Done

- **three.js masthead removed.** The masthead ripple is now a ~3KB hand-rolled
  raw-WebGL renderer in `js/main.js` (no 478KB three.js download). Because there's
  nothing heavy to fetch, it initializes right after `DOMContentLoaded` (one
  `requestAnimationFrame` later) instead of being deferred to `load` +
  `requestIdleCallback`. A CSS gradient still stands in until the canvas fades in,
  so there's no flash. Text still paints in <100ms.
