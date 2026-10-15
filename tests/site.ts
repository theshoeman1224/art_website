import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
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

// The only place these tests read source content. Update it when artwork records move.
export function artworkSlugs() {
  return listFiles(artworksDir, 'artwork.md').map((file) => {
    const slug = readFileSync(join(artworksDir, file), 'utf8').match(/^slug:\s*["']?([^"'\s]+)/m)?.[1];
    if (!slug) throw new Error(`No slug found in ${file}.`);
    return slug;
  });
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

export function existsInBuild(pathname: string) {
  const path = join(distDir, decodeURIComponent(pathname));
  const candidates = [path, join(path, 'index.html'), `${path.replace(/[\\/]$/, '')}.html`];
  return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
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
