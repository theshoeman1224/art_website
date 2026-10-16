# Performance improvements

The open items from an audit of why images visibly load in on page load, started October 15, 2026. Each issue lists what is wrong, the proposed fix, and its tradeoffs. Remove an issue once its fix lands, and delete this file once nothing is left.

Settled items have been removed; CLAUDE.md documents what they built. They were per-format compression with a full-resolution override for deep blacks (issue 1), `sizes` that follow height caps (2), an eager first row on `/artwork/` (3), high priority for each page's main image (4), a small emblem (9), and the original photograph in place of 93 generated JPEG fallbacks (part of 8). Riptide and Undertow were checked at 1:1 and look right at AVIF 60 (11). The remaining issues keep their original numbers so that older commits and PRs still point at the right one.

## Status

| # | Issue | Impact |
| --- | --- | --- |
| 5 | Lightbox opens a 1 to 2 MB file with nothing to show first | Medium |
| 6 | Clicking a card on a high-density laptop or tablet starts a fresh download | Low |
| 7 | No placeholder while an image loads | Low (perceived) |
| 8 | Oversized source photographs slow the build | None for visitors |
| 10 | Full-resolution works are now most of the image weight | Medium |

## Where things stand

Image bytes each page downloads on a first visit, measured on October 16, 2026 in headless Chromium against the current build with the cache disabled. "Before scrolling" is what loads with the page; "in total" adds everything a visitor scrolls past.

| Page | Laptop 1440 × 900, 2×: before scrolling / in total | Phone 390 × 844, 3×: before scrolling / in total |
| --- | --- | --- |
| `/` | 1.1 / 1.1 MB | 1.1 / 1.2 MB |
| `/artwork/` | 3.2 / 3.4 MB | 2.8 / 5.3 MB |
| `/artwork/riptide/` | 558 / 558 KB | 562 / 562 KB |
| `/artwork/death-isnt-black-and-white/` | 3.2 / 6.4 MB | 6.4 / 6.4 MB |

Before the audit's fixes, `/artwork/` with every card loaded was 5.0 MB on that laptop and 12.0 MB on that phone, and Riptide's hero alone was 978 KB. Caching was never the problem: the deployed site serves `/_astro/*` as immutable for a year, so a returning visitor's images come from the cache. Judge speed with `npx wrangler dev` after a build, which serves the build the way Cloudflare does; `astro dev` generates every image on request (about 2 seconds each), and `astro preview` sends `no-cache`.

## 5. The lightbox opens a 1 to 2 MB file with nothing to show first

**Problem.** Every lightbox image of a compressed work is a 2200 px WebP at quality 92: 24 files averaging 1.04 MB, up to 1.87 MB. Phones get the same file. It is requested only on click, the dialog is empty until it arrives, and previous/next starts each image from nothing. Full-resolution works are the exception: their lightbox shows the same original file as the page, so it opens from the cache.

**Fix.**

- On open, show the image already on the page (`img.currentSrc`, which is cached) at once, and swap in the full-size file when it has loaded.
- After opening, preload the previous and next full-size images.
- Give the lightbox `<img>` a srcset (1200 / 1600 / 2200, possibly AVIF) so phones get about 1200 px.

**Tradeoffs.** Preloading spends data on images that may never be viewed; one on each side is a reasonable limit. The srcset adds generated files and build time. The swap shows a slightly soft image for a moment before it sharpens. A lower lightbox quality would also save bytes, but the lightbox is where visitors look closely, so check any change with `npm run compare` first.

## 6. Clicking a card on a high-density laptop or tablet starts a fresh download

**Problem.** A card and its artwork page hero use the same srcset files, so the hero comes from the cache whenever both pick the same width. Since the `sizes` fix that is the case on phones (both 1600w), on standard-density desktops (both 960w), and for full-resolution works (the same original). On a 2× laptop or tablet the card picks 960w and the hero needs 1600w, so the click starts a download of about 250 KB.

**Options.**

- **Placeholder from the card.** When a card is clicked, remember the file it showed (`currentSrc`, in `sessionStorage`), show it at once on the artwork page, and let the sharper file replace it when it arrives. About 20 lines of script. It means a brief soft-to-sharp change, and it only helps visitors arriving from a card.
- **Prerender on hover.** Turn on `experimental.clientPrerender` (present in Astro 7.2.9) with hover-strategy prefetch in `astro.config.mjs`. In Chromium, hovering a card prerenders the whole page, hero included, so the click is near-instant. It is an experimental flag, Safari and Firefox fall back to prefetching HTML only, and it spends bandwidth on hovers that never become clicks. Do not combine it with `prefetchAll`.
- **Do nothing.** The download is small now, and only these screens pay it.

## 7. No placeholder while an image loads

**Problem.** On a slow connection an image is a charcoal box (the `img` background in `global.css`) until it appears all at once. The compression and priority fixes shrank this window, but it remains on phones over slow connections and for the full-resolution works, whose files are about 1 MB each.

**Options.**

- **Dominant colour per image**, computed at build time with sharp and set as the background. Almost free; the effect is subtle.
- **Tiny blurred preview** (about 0.5 KB each, inlined). Adds about 10 KB of HTML to `/artwork/` and build time, and blurry previews can look cheap next to fine art.
- **Fade in once loaded.** Needs a small script, and a fallback so images are not left hidden if the script fails.

Try the colour option first.

## 8. Oversized source photographs slow the build

**Problem.** Seven source photographs are above the 2000 to 3000 px CLAUDE.md asks for: the Jameson 1 and Jameson 2 heroes and SirDavis's hero and angled view (4284 × 5712), and Blue Label 1's hero and angled view and Don Julio 1942's hero (about 3000 × 4030). Every build resizes them, and `dist/` (97 MB) carries each original, since it is the `<img>` fallback.

**Fix.** Resize those seven to 3000 px on the long edge.

**Tradeoffs.** Visitors are unaffected; it only speeds up builds and deploys. It re-encodes the source files once, so do it at a high quality and keep their colour profiles.

## 10. Full-resolution works are now most of the image weight

**Problem.** `fullResolution: true` serves every photograph of Endeavor and Death Isn't Black and White as supplied, with no responsive widths. Death Isn't Black and White's card is a 1.2 MB, 2250 × 3000 file shown at about 400 px, the largest image on `/artwork/`, and the work's page is 6.4 MB. Endeavor is the homepage hero, so its 712 KB original is most of the homepage's 1.1 MB.

**Fix.** Keep the responsive widths for flagged works, but encode them at a much higher quality than the rest (for example AVIF 85 to 90) or losslessly, and keep the original in the lightbox. A narrower version keeps the originals on the work's own page and uses high-quality copies only in the grid and on the homepage, where the photographs are shown small.

**Tradeoffs.** It is still a re-encode, which is what the flag exists to avoid, so each flagged work needs a 1:1 check against its original (`npm run compare -- --only endeavor,death-isnt-black-and-white --avif 88`). `ArtworkImage` would need a second set of qualities, and the tests that require flagged works to be served byte for byte would change.

## Suggested order

1. Issues 5 and 10: the largest remaining downloads a visitor waits for.
2. Issues 6 and 7, if pages still do not feel instant.
3. Issue 8 whenever builds or deploys feel slow.
