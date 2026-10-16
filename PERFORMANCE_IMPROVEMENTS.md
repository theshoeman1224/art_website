# Performance improvements

An audit of why images visibly load in on page load, from October 15, 2026. Each issue below lists what is wrong, the proposed fix, its tradeoffs, and its status. Update the status as fixes land, and delete this file once everything in it is settled.

## Status

| # | Issue | Impact | Status |
| --- | --- | --- | --- |
| 1 | AVIF encoded at quality 88 | High | **Done** (October 15, 2026): fix B, AVIF 60 and WebP 80, with a per-work full-resolution override for deep blacks |
| 2 | `sizes` overstate height-capped images | High | **Done** (October 16, 2026): `heightCap` on `ArtworkImage` |
| 3 | First row on `/artwork/` is lazy-loaded | Medium | Open |
| 4 | Main image not fetched with high priority | Medium | **Done** (October 15, 2026) |
| 5 | Lightbox opens a 1 to 2 MB file with nothing to show first | Medium | Open |
| 6 | Clicking a card starts a fresh download | Medium | Open |
| 7 | No placeholder while an image loads | Low (perceived) | Open |
| 8 | Build output carries files nobody downloads | None for visitors | Open |
| 9 | Header logo is a 237 KB PNG shown at 52 px | Medium | Open |

## What was measured

Caching is not the problem. The deployed site serves `/_astro/*` with `Cache-Control: public, max-age=31536000, immutable` and Cloudflare reports `cf-cache-status: HIT`, so an image downloaded once comes back instantly on later visits. What is visible is the first download of each image: the files are 3 to 6 times heavier than they need to be, and the pages do not tell the browser which images matter most.

What a first visit downloads, picked the way a browser picks from the srcset, before any fix:

| Page | Laptop 1440 px @2x | Phone 390 px @3x |
| --- | --- | --- |
| Home hero | 1170w, 562 KB | 1170w, 562 KB |
| `/artwork/` first card | 960w, 427 KB | 1170w, 562 KB |
| `/artwork/riptide/` hero | 1600w, 978 KB | 1600w, 978 KB |
| `/artwork/` with every card loaded | 5.0 MB | 12.0 MB |

## 1. AVIF is encoded at quality 88

**Problem.** `ArtworkImage.astro` passes `quality={88}` to `<Picture>`, which uses one quality for every format. The two formats' scales differ: AVIF at 88 comes out larger than WebP at 88, so AVIF's size advantage is lost. AVIF at 60 is about a third the size of AVIF at 88.

**Options.**

- **A. One lower value (60 to 65) for both formats.** The smallest change. Tradeoff: WebP at 60 is visibly softer, though only browsers without AVIF (about 5% of visitors) get WebP.
- **B. A quality per format (AVIF 60, WebP 80).** Chosen for the sandbox. `<Picture>` cannot do this, so the component builds the `<picture>` itself from three `getImage()` calls. Tradeoff: about 20 more lines in the component, and the markup no longer follows Astro's `<Picture>` updates automatically.

**Risk.** An art site lives on surface detail. AVIF at 60 can smooth fine grain in dark, low-contrast areas and in gold leaf. The lightbox keeps its own high-quality file (WebP, quality 92) for close inspection, which is unaffected.

### Sandbox for fix B

Fix B was first built in a separate git worktree and compared photograph by photograph against the originals before it was merged. The figures below come from that comparison.

**Results across all 33 photographs**, at each of the three widths a visitor can receive:

| Width | Today (AVIF 88) | AVIF 60 | WebP 80 |
| --- | --- | --- | --- |
| Small, 480 px (phones in the grid) | 2.4 MB | 0.9 MB | 1.2 MB |
| Medium, 960 px (the grid on most screens) | 9.1 MB | 3.0 MB | 4.1 MB |
| Large, up to 1600 px (artwork page hero) | 21.3 MB | 6.4 MB | 8.5 MB |

Individual files shrink by 67 to 86% at 1600 px: Blue Label 1's hero goes from 989 KB to 322 KB, and Death Isn't Black and White's darkest photograph from 612 KB to 86 KB.

**Comparison page.** `npm run compare -- --avif 60 --webp 80` serves a local page (http://127.0.0.1:4390/) with each artwork photograph next to its AVIF and WebP files at those qualities. It can switch between the three widths and zoom to 1:1 or 2×, with all three panes panning together. It lives in `tools/image-compare/` (see its README), outside the site build, and its files are byte-identical to what `astro build` produces, so it replaces the sandbox worktree for judging quality. The darkest works (Riptide, Undertow, Death Isn't Black and White) and the gold leaf (Endeavor, Blue Label 1) are where a loss would show first.

**Review, October 15, 2026.** Deep blacks lose visible quality at AVIF 60. Rather than raise the quality for every work, works whose look depends on deep black now opt out of compression altogether (below). Fix B is otherwise ready.

**Adopted, October 15, 2026.** `ArtworkImage.astro` builds the `<picture>` by hand with `quality = { avif: 60, webp: 80, fallback: 80 }`. Measured on a 1440 px, 2× laptop with the deployed caching (`wrangler dev`), the images on `/` went from 2.7 to 1.8 MB, on `/artwork/` from 6.2 to 3.3 MB, and on `/artwork/riptide/` from 1.9 to 0.5 MB. Riptide and Undertow, the other dark works, have not had a 1:1 check yet: run `npm run compare -- --only riptide,undertow` and add `fullResolution: true` to either if its blacks suffer.

### Full-resolution override (done)

An artwork record can set `fullResolution: true` (validated in `src/content.config.ts`). Every photograph of that work is then served exactly as supplied: the original file, byte for byte, with no resizing, no re-encoding, no srcset, and the same file in the lightbox. Endeavor and Death Isn't Black and White have it.

- **Cost.** About 1 MB per photograph wherever the work appears. Endeavor's photographs are 712 and 736 KB, against 562 KB for today's AVIF 88 hero; Death Isn't Black and White's six are 0.85 to 1.24 MB each, 6.6 MB in all, of which only the hero loads before scrolling. Its card on `/artwork/` is a 1.2 MB, 2250 × 3000 file shown at about 400 px.
- **Middle ground, not built.** Keep the responsive widths but encode flagged works at a much higher quality, or losslessly. That costs far less on phones and in the grid, but it is still a re-encode, so it would need its own visual check against the originals.
- **Metadata.** An original keeps its metadata, and a phone photograph usually records where it was taken. None of the eight flagged photographs has GPS data, and a test fails if one ever does.
- **Tests.** Flagged works' pages serve files byte-identical to the source photographs; no page anywhere carries a resized or re-encoded copy of them, which would mean a call site forgot to pass the flag; and every other artwork page still serves AVIF.
- **For agents.** CLAUDE.md tells an agent adding an artwork to ask the user about the flag when its photographs show deep black, dark gradients, metallic sheen, or similar.

## 2. `sizes` overstate height-capped images (done)

**Problem.** `sizes` tells the browser how wide an image will be shown, before layout, so it can pick from the srcset. Three images promise far more width than they get:

- **Artwork page hero** (`src/pages/artwork/[slug].astro`): `sizes="100vw"`, but CSS caps it at `max-height: 88svh` with `object-fit: contain`. On a 1440 × 900 laptop it shows about 594 px wide, yet the browser fetches the 1600w file.
- **Homepage hero** (`src/pages/index.astro`): `58vw`, but capped at `max-height: 72svh`. Endeavor shows about 364 px wide and gets its 1170w file.
- **First "Surface and views" image** (`[slug].astro`, `sizes={index === 0 ? '100vw' : …}`): `100vw`, but it spans 7 of 12 columns unless it is a `detail` image.

**Fix.** Give `ArtworkImage` a `maxHeight` prop (in `vh`) and have it build `sizes` from the photograph's aspect ratio, for example `(min-aspect-ratio: 3/4) 66vh, 100vw`. Both `vh` units and media conditions are valid in `sizes`. The third case only needs a correct value.

**Tradeoffs.** A little more logic in the component, and the result is an approximation: `sizes` cannot use `svh`, so it uses `vh`. Erring slightly large costs little.

**Adopted, October 16, 2026.** `ArtworkImage` takes `heightCap: { vh, slot?, media? }` and puts an entry in front of the page's `sizes` for screens wide enough that the cap binds. Riptide's hero, for example, gets `(min-aspect-ratio: 660/1000) 66vh, 100vw`. The artwork page hero passes `{ vh: 88 }`; the homepage hero passes `{ vh: 72, slot: 58, media: '(min-width: 768px)' }`, which does nothing while Endeavor (full resolution) is the hero. The first "Surface and views" image now says `100vw` only when it is a full-width `detail` image. `min()` in `sizes` would be shorter, but media conditions are supported everywhere.

What headless Chromium picked for Riptide's hero, checked through the DevTools protocol:

| Screen | Before | After | Card on `/artwork/` |
| --- | --- | --- | --- |
| Phone 390 × 844, 3× | 1600w | 1600w | 1600w |
| Tablet 820 × 1180, 2× | 1600w | 1600w | 960w |
| Laptop 1440 × 900, 2× | 1600w | 1600w | 960w |
| Desktop 1920 × 1080, 1× | 1600w | **960w** | 960w |
| Desktop 2560 × 1440, 1× | 1600w | **960w** | 960w |

High-density screens still get 1600w because they show the photograph at about 1,200 device pixels or more. On standard-density desktops the hero is now the same file as the card, so clicking through from `/artwork/` loads it from the cache (see issue 6). A test reads each artwork hero's `sizes` the way a browser does and checks it against the 88vh fit on a desktop and a phone.

## 3. The first row on `/artwork/` is lazy-loaded

**Problem.** `ArtworkCard` has an `eager` prop that nothing passes, so every card on `/artwork/` is `loading="lazy"`, including the ones on screen. The browser waits for layout before it even requests them, which shows up as pop-in.

**Fix.** Pass `eager={index < 3}` from `src/pages/artwork/index.astro`.

**Tradeoff.** A phone (one column) fetches two cards early that are not yet on screen. They are the next two the visitor scrolls to.

## 4. The main image was not fetched with high priority (done)

**Problem.** The heroes used `loading="eager"` but still had `decoding="async"` and no `fetchpriority`, so the browser treated them like any other image until layout.

**Fix, implemented.** `ArtworkImage` has a `priority` prop, which Astro turns into `loading="eager" decoding="sync" fetchpriority="high"`. The homepage hero, the artwork page hero, and the About portrait use it instead of `loading="eager"`. `loading` no longer defaults to `'lazy'` in the component, because Astro only applies `priority`'s eager loading when `loading` is unset; Astro still defaults everything else to lazy. Two tests guard it: the homepage, About, and every artwork page have a high-priority image, and no page has more than one, or a lazy one. CLAUDE.md documents the rule.

**Tradeoff.** None in practice, provided it stays on one image per page. `/artwork/` has none; issue 3 covers it.

## 5. The lightbox opens a 1 to 2 MB file with nothing to show first

**Problem.** Every lightbox image is a 2200 px WebP at quality 92 (1.1 MB on average, up to 1.9 MB), and phones get the same file. It is requested only on click, the dialog is empty until it arrives, and previous/next starts each image from nothing.

**Fix.**

- On open, show the image already on the page (`img.currentSrc`, which is cached) at once, and swap in the full-size file when it has loaded.
- After opening, preload the previous and next full-size images.
- Give the lightbox `<img>` a srcset (1200 / 1600 / 2200, possibly AVIF) so phones get about 1200 px.

**Tradeoffs.** Preloading spends data on images that may never be viewed; one on each side is a reasonable limit. The srcset adds generated files and build time. The swap shows a slightly soft image for a moment before it sharpens.

## 6. Clicking a card starts a fresh download

**Problem.** The artwork page hero is a different, larger file than the card thumbnail, so nothing is in the cache when a visitor clicks through.

Since issue 2, that is only true on high-density screens other than phones: both use the same srcset files, phones already pick 1600w for both, standard-density desktops now pick 960w for both, and full-resolution works use the original for both. On a 2× laptop or tablet the card is 960w and the hero needs 1600w. A cheaper option than prerendering for those: when a card is clicked, remember the file it showed (`currentSrc`, in `sessionStorage`), show it at once on the artwork page as a placeholder, and let the sharper file replace it when it arrives. About 20 lines of script, a brief soft-to-sharp change, and it only helps visitors arriving from a card.

**Fix.** Turn on `experimental.clientPrerender` (confirmed present in Astro 7.2.9) with hover-strategy prefetch in `astro.config.mjs`. In Chromium browsers, hovering a card prerenders the whole page in the background, hero included, so the click is near-instant.

**Tradeoffs.** It is an experimental flag. It only works in Chromium; Safari and Firefox fall back to prefetching HTML only, which does not help with images. It spends bandwidth on hovers that never become clicks. Do not combine it with `prefetchAll`.

## 7. No placeholder while an image loads

**Problem.** On a slow connection an image is a charcoal box until it appears all at once. Issues 1 to 4 shrink this window but do not remove it.

**Options.**

- **Dominant colour per image**, computed at build time with sharp and set as the background. Almost free; the effect is subtle.
- **Tiny blurred preview** (about 0.5 KB each, inlined). Adds about 10 KB of HTML to `/artwork/` and build time, and blurry previews can look cheap next to fine art.
- **Fade in once loaded.** Needs a small script, and a fallback so images are not left hidden if the script fails.

Revisit after issues 1 to 4; try the colour option first.

## 8. Build output carries files nobody downloads

Visitors are unaffected; this costs build and deploy time.

- `dist/` is 207 MB. 49 MB of it is the 32 original JPEGs, copied verbatim. Only the eight photographs of the two full-resolution works are referenced by a page.
- 70 MB is JPEG fallback files, used only by browsers without WebP support. Each `<img>` also has a `src` (as opposed to its srcset) at the photograph's full resolution, up to 4.3 MB; no current browser requests it. Setting `fallbackFormat: 'webp'` would drop the JPEGs (fix B would change the fallback format instead), at the cost of very old browsers showing no image.
- Four source photographs (Jameson 1, Jameson 2, SirDavis, Blue Label 1) are 4000 to 5700 px, above the 2000 to 3000 px CLAUDE.md asks for. Downsizing them only speeds up builds.

## 9. The header logo is a 237 KB PNG shown at 52 px

**Problem.** `src/assets/endeavor-emblem.png` (512 × 512) is used as `emblem.src` directly in `Header.astro` (52 px), `Footer.astro` (112 px), and the favicon, so it is never optimized. It is the first image on every page, so it is part of the loading a visitor sees on their first page.

**Fix.** Render the header and footer marks with Astro's `<Image>` at 2× their display size. Measured: 104 px is 3.0 KB as AVIF and 4.5 KB as WebP; 224 px is 7.6 KB as AVIF. Generate a small PNG for the favicon, and keep the 512 px original for the Organization JSON-LD `logo`.

**Tradeoff.** None worth noting.

## Suggested order

1. Issues 1 (once the comparison is signed off), 2, 3, and 9: small code changes that cut the first image on most pages by about 3 to 5 times and remove the pop-in on `/artwork/`.
2. Issue 5, the lightbox.
3. Issues 6 and 7, if pages still do not feel instant.
4. Issue 8 whenever builds or deploys feel slow.
