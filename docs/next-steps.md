# Next steps

Running list of performance/site follow-ups.

## Open

- **Serve webp on the remaining lab/ pages.** The pipeline now resizes + generates
  webp for `lab/` images, and the resized originals are already much smaller, but
  these pages still serve jpg/png rather than webp: the puzzle pages
  (`lab/puzzle/*`, uniform `<div class="img-splash"><div class="img-container"><img></div></div>`),
  the theater diary (`lab/yoc/theater/index.html`), the 2 Rooms ARG
  (`lab/2raab/*` — small images, ~22 pages), and the inline `{: .img-splash }`
  images in `lab/irl/media-panel` and `lab/irl/wave-table`. To finish: wrap each
  `<img>` in `<picture>` with a `.webp` source (the `.img-splash img` selector is
  already updated to match nested imgs). Diminishing returns after the resize.

## Done

- **webp for content images.** Galleries, the footer avatar, all blog-post inline
  images, and the lantern-coast page now serve webp (with original fallback). The
  image pipeline (`bin/thumbs.mjs`) covers `img/`, `scribble/`, and `lab/`; `lab/`
  images were resized in place (~24MB -> ~11.5MB). New content images can use
  `{% include image.html src="..." %}`.
- **three.js masthead removed.** The masthead ripple is now a ~3KB hand-rolled
  raw-WebGL renderer in `js/main.js` (no 478KB three.js download), initialized
  right after `DOMContentLoaded` with a CSS-gradient stand-in (no flash). Text
  still paints in <100ms.
