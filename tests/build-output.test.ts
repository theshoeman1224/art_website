import { describe, expect, it } from 'vitest';
import { sectionIds } from '../src/sections';
import { artworkSlugs, existsInBuild, loadPages, references, withTrailingSlash, type Page } from './site';

const pages = loadPages();
const routes = pages.map((page) => page.route);

function linkedRoutes(page: Page | undefined) {
  return (page?.html.querySelectorAll('a[href]') ?? []).map((link) =>
    withTrailingSlash(link.getAttribute('href') ?? ''),
  );
}

describe('built site', () => {
  it('includes the top-level pages', () => {
    expect(routes).toEqual(
      expect.arrayContaining(['/', '/artwork/', '/about/', '/commissions/', '/contact/', '/404/']),
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

  it('gives every artwork card an overlay with its size, and a status label unless it is available', () => {
    const artwork = pages.find((page) => page.route === '/artwork/');
    const overlays = artwork?.html.querySelectorAll('[data-artwork] .artwork-overlay') ?? [];
    const labels: Record<string, string | undefined> = { available: undefined, unavailable: 'Unavailable', sold: 'Sold' };

    expect(overlays).toHaveLength(artworkSlugs().length);
    for (const overlay of overlays) {
      const status = overlay.getAttribute('data-artwork-status') ?? '';

      expect(Object.keys(labels)).toContain(status);
      expect(overlay.querySelector('.artwork-size')?.text.trim()).toBeTruthy();
      expect(overlay.querySelector('.artwork-status')?.text.trim()).toBe(labels[status]);
    }
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
