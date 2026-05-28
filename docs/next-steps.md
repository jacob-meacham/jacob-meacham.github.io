# Next steps

Running list of performance/site follow-ups.

## Open

- **Theater diary uses JS-generated `<img>`.** `lab/yoc/theater/theater.js`
  appends diary-entry images (`img/<side>_top.png` etc.) at runtime, so they
  still load as png rather than webp. Low value: they're small, reused (cached
  after first load), and the one large photo was already resized by the pipeline.
  Would require teaching `theater.js`/`diary*.js` to emit `<picture>` or `.webp`.

## Done

- **webp for content images (site-wide).** Galleries, footer avatar, all blog-post
  inline images, lantern-coast, and the remaining lab pages (puzzle, theater
  static images, 2 Rooms ARG, media-panel, wave-table) now serve webp with the
  original as fallback. The pipeline (`bin/thumbs.mjs`) covers `img/`, `scribble/`,
  and `lab/`; `lab/` photos were resized in place (~24MB -> ~11.5MB). New content
  images: `{% include image.html src="..." %}`.
- **three.js masthead removed.** Now a ~3KB hand-rolled raw-WebGL renderer in
  `js/main.js` (no 478KB download), initialized after `DOMContentLoaded` with a
  CSS-gradient stand-in. Text still paints in <100ms.
