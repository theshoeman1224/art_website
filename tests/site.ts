import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type HTMLElement } from 'node-html-parser';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(rootDir, 'dist');
const artworksDir = join(rootDir, 'src/content/artworks');

export interface Page {
  route: string;
  html: HTMLElement;
}

function listFiles(dir: string, suffix: string) {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.split(sep).join('/'))
    .sort();
}

function routeFor(file: string) {
  const path = file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/');
  return `/${path}`;
}

export function loadPages(): Page[] {
  if (!existsSync(distDir)) {
    throw new Error('dist/ does not exist. Run "npm test", which builds the site before testing it.');
  }

  return listFiles(distDir, '.html').map((file) => ({
    route: routeFor(file),
    html: parse(readFileSync(join(distDir, file), 'utf8')),
  }));
}

// artworkSlugs(), fullResolutionWorks(), and hasGpsMetadata() are the only places these tests read source content.
// Update them when artwork records move or change format.
function slugOf(file: string, record: string) {
  const slug = record.match(/^slug:\s*["']?([^"'\s]+)/m)?.[1];
  if (!slug) throw new Error(`No slug found in ${file}.`);
  return slug;
}

export function artworkSlugs() {
  return listFiles(artworksDir, 'artwork.md').map((file) => slugOf(file, readFileSync(join(artworksDir, file), 'utf8')));
}

// Records with `fullResolution: true`, and the photographs in their folders.
export function fullResolutionWorks() {
  return listFiles(artworksDir, 'artwork.md').flatMap((file) => {
    const record = readFileSync(join(artworksDir, file), 'utf8');
    if (!/^fullResolution:\s*true\b/m.test(record)) return [];
    const folder = dirname(join(artworksDir, file));
    const photographs = readdirSync(folder)
      .filter((name) => /\.(jpe?g|png)$/i.test(name))
      .map((name) => join(folder, name));
    return [{ slug: slugOf(file, record), photographs }];
  });
}

// Whether a photograph records where it was taken: a JPEG whose EXIF block points to GPS data. A PNG with any EXIF
// chunk counts, to be safe. Only matters for files served as supplied; the image pipeline drops metadata.
export function hasGpsMetadata(file: string) {
  const bytes = readFileSync(file);
  if (bytes.readUInt16BE(0) !== 0xffd8) return bytes.includes('eXIf');

  for (let offset = 2; offset + 4 <= bytes.length && bytes[offset] === 0xff; offset += 2 + bytes.readUInt16BE(offset + 2)) {
    const marker = bytes[offset + 1];
    if (marker === 0xda) break; // Start of the image data, after which there are no more metadata segments.
    if (marker !== 0xe1 || bytes.toString('latin1', offset + 4, offset + 10) !== 'Exif\0\0') continue;

    const tiff = offset + 10;
    const little = bytes.toString('latin1', tiff, tiff + 2) === 'II';
    const u16 = (at: number) => (little ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at));
    const u32 = (at: number) => (little ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at));
    const ifd0 = tiff + u32(tiff + 4);
    for (let entry = 0; entry < u16(ifd0); entry++) {
      if (u16(ifd0 + 2 + entry * 12) === 0x8825) return true; // The GPS IFD pointer.
    }
  }
  return false;
}

// A content hash of a file in the repository (an absolute path) or in the build (a URL path such as /_astro/x.jpeg).
export function digest(path: string) {
  const file = path.startsWith(rootDir) ? path : join(distDir, decodeURIComponent(path));
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// Same-origin `<a href>` targets that are pages rather than files (their last path segment has no extension).
// `base` is the page's canonical URL, which also decides what counts as same-origin.
export function internalPageLinks(html: HTMLElement, base: string) {
  return html
    .querySelectorAll('a[href]')
    .map((link) => new URL(link.getAttribute('href') ?? '', base))
    .filter((url) => url.origin === new URL(base).origin && !/\.[a-z0-9]+$/i.test(url.pathname));
}

export function distFile(path: string) {
  return readFileSync(join(distDir, path), 'utf8');
}

export function distFiles(dir: string) {
  return listFiles(join(distDir, dir), '');
}

export function rootFile(path: string) {
  return readFileSync(join(rootDir, path), 'utf8');
}

// public/_headers as a map from each path pattern to its header lines.
export function headerRules() {
  const rules = new Map<string, string[]>();
  let current: string[] = [];
  for (const line of distFile('_headers').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line)) current.push(line.trim());
    else rules.set(line.trim(), (current = []));
  }
  return rules;
}

export function existsInBuild(pathname: string) {
  const path = join(distDir, decodeURIComponent(pathname));
  const candidates = [path, join(path, 'index.html'), `${path.replace(/[\\/]$/, '')}.html`];
  return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

// The size in bytes of a built file, from its URL path.
export function builtSize(pathname: string) {
  return statSync(join(distDir, decodeURIComponent(pathname))).size;
}

export function references(html: HTMLElement) {
  const single = ['href', 'src', 'data-lightbox-src'].flatMap((name) =>
    html.querySelectorAll(`[${name}]`).map((element) => element.getAttribute(name) ?? ''),
  );
  const srcsets = html.querySelectorAll('[srcset]').flatMap((element) =>
    (element.getAttribute('srcset') ?? '').split(',').map((candidate) => candidate.trim().split(/\s+/)[0]),
  );
  return [...new Set([...single, ...srcsets])].filter((reference) => reference !== '');
}

// How wide a browser on this screen expects an image to show, read from its `sizes` the way the browser reads it
// before layout. It understands only the media features and units the site writes, and throws on anything else.
export function sizeOnScreen(sizes: string, screen: { width: number; height: number }) {
  const units: Record<string, number> = { px: 1, vw: screen.width / 100, vh: screen.height / 100 };
  const features: Record<string, (value: string) => boolean> = {
    'min-width': (value) => screen.width >= Number.parseFloat(value),
    'min-aspect-ratio': (value) => {
      const [a, b] = value.split('/').map(Number);
      return screen.width / screen.height >= a / b;
    },
  };

  for (const entry of sizes.split(',').map((part) => part.trim())) {
    const [, condition = '', number, unit] = entry.match(/^(.*?)\s*([\d.]+)(px|vw|vh)$/) ?? [];
    if (!number) throw new Error(`Cannot read the sizes entry "${entry}".`);
    const matches = condition === '' || condition.split(/\s+and\s+/).every((part) => {
      const [, name, value] = part.match(/^\(([a-z-]+):\s*([^)]+)\)$/) ?? [];
      if (!features[name]) throw new Error(`Cannot read the media condition "${part}".`);
      return features[name](value);
    });
    if (matches) return Number(number) * units[unit];
  }
  throw new Error(`"${sizes}" has no entry for a ${screen.width} × ${screen.height} screen.`);
}
