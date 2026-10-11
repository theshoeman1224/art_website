import { describe, expect, it } from 'vitest';
import { artworkSlugs, existsInBuild, loadPages, references, withTrailingSlash } from './site';

const pages = loadPages();
const routes = pages.map((page) => page.route);

describe('built site', () => {
  it('includes the top-level pages', () => {
    expect(routes).toEqual(
      expect.arrayContaining(['/', '/work/', '/about/', '/commissions/', '/contact/', '/404/']),
    );
  });

  it('has exactly one page per artwork record', () => {
    const artworkRoutes = routes.filter((route) => /^\/work\/[^/]+\/$/.test(route));
    const expected = artworkSlugs().map((slug) => `/work/${slug}/`);

    expect(artworkRoutes.sort()).toEqual(expected.sort());
  });

  it('links every artwork from the portfolio page', () => {
    const portfolio = pages.find((page) => page.route === '/work/');
    const linked = portfolio?.html
      .querySelectorAll('a[href]')
      .map((link) => withTrailingSlash(link.getAttribute('href') ?? ''));

    expect(linked).toEqual(expect.arrayContaining(artworkSlugs().map((slug) => `/work/${slug}/`)));
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
