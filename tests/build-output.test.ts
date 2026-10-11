import { describe, expect, it } from 'vitest';
import { sectionIds } from '../src/sections';
import { artworkSlugs, existsInBuild, loadPages, references, withTrailingSlash, type Page } from './site';

const pages = loadPages();
const routes = pages.map((page) => page.route);
const sectionRoutes = sectionIds.map((id) => `/work/${id}/`);

function linkedRoutes(page: Page | undefined) {
  return (page?.html.querySelectorAll('a[href]') ?? []).map((link) =>
    withTrailingSlash(link.getAttribute('href') ?? ''),
  );
}

describe('built site', () => {
  it('includes the top-level pages', () => {
    expect(routes).toEqual(
      expect.arrayContaining(['/', '/work/', '/artwork/', '/about/', '/commissions/', '/contact/', '/404/', ...sectionRoutes]),
    );
  });

  it('has exactly one page per artwork record', () => {
    const artworkRoutes = routes.filter(
      (route) => /^\/work\/[^/]+\/$/.test(route) && !sectionRoutes.includes(route),
    );
    const expected = artworkSlugs().map((slug) => `/work/${slug}/`);

    expect(artworkRoutes.sort()).toEqual(expected.sort());
  });

  it('links every section from the portfolio page', () => {
    const portfolio = pages.find((page) => page.route === '/work/');

    expect(linkedRoutes(portfolio)).toEqual(expect.arrayContaining(sectionRoutes));
  });

  it('links every artwork from a section page', () => {
    const linked = pages.filter((page) => sectionRoutes.includes(page.route)).flatMap(linkedRoutes);

    expect(linked).toEqual(expect.arrayContaining(artworkSlugs().map((slug) => `/work/${slug}/`)));
  });

  it('lists every artwork on the artwork page, tagged only with filters it offers', () => {
    const artwork = pages.find((page) => page.route === '/artwork/');
    const items = artwork?.html.querySelectorAll('[data-artwork]') ?? [];
    const offered = artwork?.html.querySelectorAll('[data-filter]').map((button) => button.getAttribute('data-filter'));
    const tags = items.flatMap((item) => (item.getAttribute('data-filters') ?? '').split(' '));

    expect(items).toHaveLength(artworkSlugs().length);
    expect(linkedRoutes(artwork)).toEqual(expect.arrayContaining(artworkSlugs().map((slug) => `/work/${slug}/`)));
    expect(offered).toEqual(expect.arrayContaining([...sectionIds, 'available']));
    expect(offered).toEqual(expect.arrayContaining([...new Set(tags)]));
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
