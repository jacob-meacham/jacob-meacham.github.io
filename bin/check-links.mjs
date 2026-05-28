#!/usr/bin/env node
/*
 * Guards against the GitHub/CF Pages 301 that fires when an internal link to a
 * directory page omits the trailing slash (e.g. /games -> 301 -> /games/).
 *
 * Scans source .html/.md for internal links of the form /path (no trailing
 * slash, no file extension) and flags any where path/index.{html,md} exists,
 * because that page is served at /path/ and the bare link will redirect.
 *
 *   node bin/check-links.mjs          report offenders, exit 1 if any
 *   node bin/check-links.mjs --fix    add the missing slashes in place
 *
 * Note: pages that become directories via a `permalink:` (rather than living in
 * an actual folder) aren't detected here; this covers the folder-index pages
 * the site actually uses.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['_site', 'node_modules', '.git', '.jekyll-cache', 'vendor', '.obsidian']);
const SCAN_EXT = new Set(['.html', '.md']);
const fix = process.argv.includes('--fix');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

// A bare internal path needs a slash if path/index.{html,md} exists in source.
const dirPageCache = new Map();
function isDirectoryPage(p) {
  if (dirPageCache.has(p)) return dirPageCache.get(p);
  const base = path.join(ROOT, p.replace(/^\//, ''));
  const hit = existsSync(path.join(base, 'index.html')) || existsSync(path.join(base, 'index.md'));
  dirPageCache.set(p, hit);
  return hit;
}

function extractLinks(text) {
  const links = [];
  let m;
  const reHref = /(href\s*=\s*)(["'])([^"']+)\2/g;
  while ((m = reHref.exec(text))) links.push({ raw: m[0], quote: m[2], url: m[3], kind: 'href' });
  const reMd = /\]\((\/[^)\s]+)\)/g;
  while ((m = reMd.exec(text))) links.push({ raw: m[0], url: m[1], kind: 'md' });
  return links;
}

function offends(url) {
  if (!url.startsWith('/') || url.startsWith('//')) return false; // external/protocol-relative
  const clean = url.replace(/[?#].*$/, '');
  if (clean === '/' || clean.endsWith('/')) return false;
  if (/\.[a-z0-9]+$/i.test(clean)) return false; // has a file extension
  return isDirectoryPage(clean);
}

let issues = 0, fixedCount = 0;
for (const file of walk(ROOT)) {
  let text = readFileSync(file, 'utf8');
  let changed = false;
  for (const link of extractLinks(text)) {
    if (!offends(link.url)) continue;
    issues++;
    const rel = path.relative(ROOT, file);
    if (fix) {
      const fixedRaw = link.kind === 'href'
        ? link.raw.replace(`${link.quote}${link.url}${link.quote}`, `${link.quote}${link.url}/${link.quote}`)
        : link.raw.replace(`(${link.url})`, `(${link.url}/)`);
      text = text.replace(link.raw, fixedRaw);
      changed = true;
      fixedCount++;
      console.log(`  fixed  ${rel}: ${link.url} -> ${link.url}/`);
    } else {
      console.log(`  301 risk  ${rel}: ${link.url}  (served at ${link.url}/)`);
    }
  }
  if (changed) writeFileSync(file, text);
}

if (fix) {
  console.log(`\ncheck-links: fixed ${fixedCount} link(s).`);
  process.exit(0);
}
if (issues) {
  console.log(`\ncheck-links: ${issues} internal link(s) missing a trailing slash. Run \`npm run check:links -- --fix\`.`);
  process.exit(1);
}
console.log('check-links: all internal directory links are canonical.');
