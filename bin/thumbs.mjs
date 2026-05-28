#!/usr/bin/env node
/*
 * Image pipeline for jemonjam.com.
 *
 * Walks the image directories and, for every raster image:
 *   1. Downscales it in place if it is wider than a sensible max
 *      (thumbnails -> 600px, everything else -> 1600px). Originals are
 *      recoverable via git history.
 *   2. Generates a `.webp` sibling (served to browsers that support it).
 *
 * Idempotent: re-running only touches images that changed. Just run
 * `npm run thumbs` (dev.sh runs it automatically before serving).
 *
 * Flags:
 *   --force   regenerate every webp and recompress, ignoring timestamps
 *   --quiet   only print the summary
 */
import sharp from 'sharp';
import { readdir, stat, rename, utimes } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['img', 'scribble', 'lab'];
const IGNORE_DIRS = new Set(['icons']);
const RASTER = /\.(jpe?g|png)$/i;
const THUMB = /[-_]thumb\.[^.]+$/i;

const THUMB_MAX = 600;   // card / thumbnail display size (incl. retina headroom)
const FULL_MAX = 1600;   // gallery / full images
const JPEG_Q = 82;
const WEBP_Q = 80;
const MIN_WEBP_BYTES = 6 * 1024; // don't bother making webp for tiny images

const force = process.argv.includes('--force');
const quiet = process.argv.includes('--quiet');

let processed = 0, resized = 0, webpMade = 0, bytesBefore = 0, bytesAfter = 0;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

function log(...args) { if (!quiet) console.log(...args); }

async function newerThan(a, b) {
  // true if a is newer (more recently modified) than b
  const [sa, sb] = await Promise.all([stat(a), stat(b)]);
  return sa.mtimeMs > sb.mtimeMs;
}

async function processImage(file) {
  const maxWidth = THUMB.test(file) ? THUMB_MAX : FULL_MAX;
  let meta;
  try { meta = await sharp(file).metadata(); }
  catch { return; } // not a real image
  if (!meta.width) return;

  processed++;
  const sizeBefore = (await stat(file)).size;
  bytesBefore += sizeBefore;

  // 1. Downscale in place when too large.
  if (meta.width > maxWidth || force) {
    if (meta.width > maxWidth) {
      const ext = path.extname(file).toLowerCase();
      const tmp = file + '.tmp';
      let pipe = sharp(file).resize({ width: maxWidth, withoutEnlargement: true });
      pipe = (ext === '.png')
        ? pipe.png({ compressionLevel: 9, palette: true })
        : pipe.jpeg({ quality: JPEG_Q, mozjpeg: true });
      await pipe.toFile(tmp);
      await rename(tmp, file);
      resized++;
      const after = (await stat(file)).size;
      log(`  resized ${meta.width}px -> ${maxWidth}px  ${(sizeBefore/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB  ${file}`);
    }
  }

  const sizeNow = (await stat(file)).size;
  bytesAfter += sizeNow;

  // 2. Generate webp sibling.
  if (sizeNow < MIN_WEBP_BYTES && !force) return;
  const webp = file.replace(RASTER, '.webp');
  const fresh = existsSync(webp) && !force && await newerThan(webp, file);
  if (fresh) return;

  await sharp(file).webp({ quality: WEBP_Q }).toFile(webp);
  // Ensure the webp is stamped newer than its source so we skip it next run.
  const now = new Date();
  await utimes(webp, now, now);
  webpMade++;
  const wsize = (await stat(webp)).size;
  log(`  webp ${(wsize/1024).toFixed(0)}KB  ${webp}`);
}

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for await (const file of walk(root)) {
    if (RASTER.test(file)) await processImage(file);
  }
}

console.log(
  `\nthumbs: ${processed} images, ${resized} resized, ${webpMade} webp written. ` +
  `Raster bytes ${(bytesBefore/1024/1024).toFixed(2)}MB -> ${(bytesAfter/1024/1024).toFixed(2)}MB.`
);
