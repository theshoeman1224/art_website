import { describe, expect, it } from 'vitest';
import { inquiryTypes, pieceNotListed } from '../src/inquiry';
import { sectionIds } from '../src/sections';
import {
  artworkSlugs,
  digest,
  distFile,
  distFiles,
  existsInBuild,
  fullResolutionWorks,
  hasGpsMetadata,
  headerRules,
  internalPageLinks,
  loadPages,
  references,
  rootFile,
  type Page,
} from './site';

const pages = loadPages();
const routes = pages.map((page) => page.route);

// Taken as written, so a link missing its trailing slash does not count.
function linkedRoutes(page: Page | undefined) {
  return (page?.html.querySelectorAll('a[href]') ?? []).map((link) => link.getAttribute('href') ?? '');
}

describe('built site', () => {
  it('includes the top-level pages', () => {
    expect(routes).toEqual(
      expect.arrayContaining(['/', '/artwork/', '/about/', '/contact/', '/404/']),
    );
  });

  it('has exactly one page per artwork record', () => {
    const artworkRoutes = routes.filter((route) => /^\/artwork\/[^/]+\/$/.test(route));
    const expected = artworkSlugs().map((slug) => `/artwork/${slug}/`);

    expect(artworkRoutes.sort()).toEqual(expected.sort());
  });

  it('lists every artwork on the artwork page, tagged only with filters it offers', () => {
    const artwork = pages.find((page) => page.route === '/artwork/');
    const items = artwork?.html.querySelectorAll('[data-artwork]') ?? [];
    const offered = artwork?.html.querySelectorAll('[data-filter]').map((button) => button.getAttribute('data-filter'));
    const tags = items.flatMap((item) => (item.getAttribute('data-filters') ?? '').split(' '));

    expect(items).toHaveLength(artworkSlugs().length);
    expect(linkedRoutes(artwork)).toEqual(expect.arrayContaining(artworkSlugs().map((slug) => `/artwork/${slug}/`)));
    expect(offered).toEqual(expect.arrayContaining([...sectionIds, 'available', 'unavailable', 'sold']));
    expect(offered).toEqual(expect.arrayContaining([...new Set(tags)]));
  });

  it('gives every artwork card an overlay with its size, and a status label unless it is available or has no status', () => {
    const artwork = pages.find((page) => page.route === '/artwork/');
    const overlays = artwork?.html.querySelectorAll('[data-artwork] .artwork-overlay') ?? [];
    const labels: Record<string, string | undefined> = { '': undefined, available: undefined, unavailable: 'Unavailable', sold: 'Sold' };

    expect(overlays).toHaveLength(artworkSlugs().length);
    for (const overlay of overlays) {
      const status = overlay.getAttribute('data-artwork-status') ?? '';

      expect(Object.keys(labels)).toContain(status);
      expect(overlay.querySelector('.artwork-size')?.text.trim()).toBeTruthy();
      expect(overlay.querySelector('.artwork-status')?.text.trim()).toBe(labels[status]);
    }
  });

  it('redirects the retired /commissions page to the commission inquiry', () => {
    const rules = distFile('_redirects')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.trim().split(/\s+/));

    expect(routes).not.toContain('/commissions/');
    expect(rules).toEqual(
      expect.arrayContaining([
        ['/commissions', '/contact/?type=commission', '302'],
        ['/commissions/', '/contact/?type=commission', '302'],
      ]),
    );
  });

  it('offers every inquiry type and every artwork on the contact form', () => {
    const contact = pages.find((page) => page.route === '/contact/');
    const types = contact?.html.querySelectorAll('input[name="type"]').map((input) => input.getAttribute('value'));
    const pieces = contact?.html.querySelectorAll('select[name="piece"] option').map((option) => option.getAttribute('value'));

    expect(types).toEqual(inquiryTypes.map((type) => type.id));
    expect(pieces).toEqual(expect.arrayContaining([...artworkSlugs(), pieceNotListed]));
  });

  // A workers.dev address is <worker name>.<account subdomain>.workers.dev. Only a deploy shows whether the
  // subdomain is right, but a missing one, or another Worker's name, is caught here. Custom domains are not checked.
  it('publishes canonical URLs on the deployed host', () => {
    const worker = rootFile('wrangler.jsonc').match(/"name":\s*"([^"]+)"/)?.[1];
    const hosts = new Set(pages.map((page) => new URL(page.html.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '').host));

    expect(hosts.size).toBe(1);
    const [host] = hosts;
    if (host.endsWith('.workers.dev')) expect(host).toMatch(new RegExp(`^${worker}\\.[a-z0-9-]+\\.workers\\.dev$`));
  });

  // Safe only because every file under /_astro/ has a content hash in its name: changed content gets a new URL.
  it('caches hashed build files for a year, and nothing else', () => {
    const rules = headerRules();
    const otherCaching = [...rules].filter(([path, headers]) => path !== '/_astro/*' && headers.some((h) => /^cache-control:/i.test(h)));
    const unhashed = distFiles('_astro').filter((file) => !/\.[A-Za-z0-9_-]{8}(_[A-Za-z0-9_-]+)?\.[a-z0-9]+$/.test(file));

    expect(rules.get('/_astro/*')).toContain('Cache-Control: public, max-age=31536000, immutable');
    expect(otherCaching).toEqual([]);
    expect(unhashed).toEqual([]);
  });

  it('keeps placeholder artwork copy off the homepage', () => {
    const body = pages.find((page) => page.route === '/')?.html.querySelector('body');
    const descriptions = (body?.querySelectorAll('[alt], [aria-label], [data-lightbox-caption]') ?? []).flatMap(
      (element) => ['alt', 'aria-label', 'data-lightbox-caption'].map((name) => element.getAttribute(name) ?? ''),
    );

    expect(body).toBeTruthy();
    expect(body?.text.includes('TODO')).toBe(false);
    expect(descriptions.filter((description) => description.includes('TODO'))).toEqual([]);
  });

  it('fetches the main image first on the homepage, the about page, and every artwork page', () => {
    const leadRoutes = ['/', '/about/', ...artworkSlugs().map((slug) => `/artwork/${slug}/`)];
    const withoutLead = pages.filter((page) => leadRoutes.includes(page.route) && !page.html.querySelector('img[fetchpriority="high"]'));

    expect(withoutLead.map((page) => page.route)).toEqual([]);
  });

  it('serves the photographs of full-resolution works exactly as supplied, wherever they appear', () => {
    for (const work of fullResolutionWorks()) {
      const page = pages.find((candidate) => candidate.route === `/artwork/${work.slug}/`);
      const served = page?.html.querySelectorAll('article picture img').map((image) => image.getAttribute('src') ?? '') ?? [];

      expect(new Set(served.map(digest))).toEqual(new Set(work.photographs.map(digest)));
      expect(page?.html.querySelectorAll('article picture source, article picture img[srcset]')).toHaveLength(0);

      // The pipeline names its copies after the original plus a suffix, so one anywhere means a call site forgot the flag.
      const copyPrefixes = served.map((src) => src.replace(/\.[a-z]+$/i, '_'));
      const copies = pages.flatMap((other) => references(other.html)).filter((url) => copyPrefixes.some((prefix) => url.startsWith(prefix)));
      expect(copies).toEqual([]);
    }
  });

  it('optimizes the photographs of every other work', () => {
    const fullResolutionRoutes = fullResolutionWorks().map((work) => `/artwork/${work.slug}/`);
    const unoptimized = pages.filter((page) =>
      /^\/artwork\/[^/]+\/$/.test(page.route)
      && !fullResolutionRoutes.includes(page.route)
      && !page.html.querySelector('article source[type="image/avif"]'));

    expect(unoptimized.map((page) => page.route)).toEqual([]);
  });

  // Served as supplied, a photograph keeps its metadata, and a phone's records where it was taken.
  it('serves no full-resolution photograph that records where it was taken', () => {
    expect(fullResolutionWorks().flatMap((work) => work.photographs).filter(hasGpsMetadata)).toEqual([]);
  });
});

describe.each(pages)('page $route', ({ route, html }) => {
  const canonical = html.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';

  it('has its document metadata', () => {
    expect(html.querySelector('html')?.getAttribute('lang')).toBeTruthy();
    expect(html.querySelector('title')?.text.trim()).toBeTruthy();
    expect(html.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()).toBeTruthy();
    expect(html.querySelectorAll('h1')).toHaveLength(1);
  });

  it('has a canonical URL that matches its route', () => {
    expect(URL.canParse(canonical)).toBe(true);
    expect(new URL(canonical).pathname).toBe(route);
  });

  it('gives every image alt text', () => {
    const missingAlt = html.querySelectorAll('img').filter((image) => image.getAttribute('alt') === undefined);
    // An empty alt is valid for decorative images, but artwork photographs must be described.
    const undescribed = [
      ...html.querySelectorAll('picture img').filter((image) => !image.getAttribute('alt')?.trim()),
      ...html.querySelectorAll('[data-lightbox-src]').filter((trigger) => !trigger.getAttribute('data-lightbox-alt')?.trim()),
    ];

    expect(missingAlt.map((image) => image.toString())).toEqual([]);
    expect(undescribed.map((element) => element.toString())).toEqual([]);
  });

  // A priority hint only works if it is rare: a second urgent image competes with the first.
  it('fetches at most one image with high priority, and never lazily', () => {
    const urgent = html.querySelectorAll('img[fetchpriority="high"]');

    expect(urgent.length).toBeLessThanOrEqual(1);
    expect(urgent.filter((image) => image.getAttribute('loading') === 'lazy').map((image) => image.toString())).toEqual([]);
  });

  // Cloudflare serves each page at <route>/ and answers <route> with a redirect, so a link without the slash costs
  // every visitor an extra round trip. `astro dev` does not redirect, which is why this is checked here.
  it('links to internal pages with a trailing slash', () => {
    const missingSlash = internalPageLinks(html, canonical).filter((url) => !url.pathname.endsWith('/'));

    expect(missingSlash.map((url) => url.pathname + url.search)).toEqual([]);
  });

  it('only references pages, files, and anchors that exist', () => {
    const broken = references(html).filter((reference) => {
      if (reference.startsWith('#')) return !html.getElementById(reference.slice(1));

      const url = new URL(reference, canonical);
      if (url.origin !== new URL(canonical).origin) return false;
      return !existsInBuild(url.pathname);
    });

    expect(broken).toEqual([]);
  });
});
