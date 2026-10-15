# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Endeavor Art Studio: a static Astro 7 portfolio site for a mixed-media artist. No UI framework, no adapter, no server code. Output is plain HTML/CSS/JS plus build-time optimized images. The `/contact` form has no submission backend yet (see "Contact form" below).

## Commands

Requires Node.js 22+.

```bash
npm run dev       # Dev server, normally http://localhost:4321
npm run check     # astro check: TypeScript, .astro diagnostics, and content schema validation
npm run build     # astro check && astro build, output in dist/
npm run preview   # Serve dist/ locally
npm test          # npm run build, then vitest run
```

There is no linter or formatter. `npm run check` is what catches a malformed artwork record.

### Tests

Most of the Vitest suite in `tests/` parses the HTML that `astro build` wrote to `dist/` and checks routes, document metadata, canonical URLs, image alt text, the `/commissions` redirect, that every internal page link ends in a trailing slash, and that every internal link, asset, and anchor resolves. It therefore needs a current build. The one exception is `tests/inquiry.test.ts`, which unit-tests the form logic in `src/inquiry.ts` directly:

```bash
npm test                              # Rebuild, then run everything
npx vitest run                        # Run against the existing dist/ without rebuilding
npx vitest run -t "page /about/"      # Run the tests for one page
```

Per-page tests are generated from whatever HTML files are in `dist/`, so new pages are covered automatically. `tests/site.ts` holds the helpers; its `artworkSlugs()` is the only place the tests read source content, and it must be updated if artwork records move or change format. The suite also imports `sectionIds` from `src/sections.ts` to check that `/artwork` offers a filter for every section, and `inquiryTypes` from `src/inquiry.ts` to check that `/contact` offers every inquiry type and every artwork.

## Architecture

### Artwork content collection

Each artwork is a self-contained folder, `src/content/artworks/<slug>/`, holding `artwork.md` (frontmatter only) and its photographs. Adding a folder is all it takes to publish a work: it appears on `/artwork`, under the filter of every section it lists, and gets an `/artwork/<slug>` page.

The schema in `src/content.config.ts` validates the frontmatter and then **transforms** it, so the shape pages read from `artwork.data` differs from what is written in `artwork.md`:

| Frontmatter | `artwork.data` |
| --- | --- |
| `dimensions: { height, width, depth?, unit, each? }` | `dimensions` is a display string such as `24 × 36 in`: the smaller of height and width comes first, then depth, and `each: true` appends `each` for a work made of same-sized parts |
| `images[]` entry with `role: hero` | pulled out into `hero: { src, alt }` |
| remaining `images[]` entries, each with `role` | `images[]` without the hero, and `role` renamed to `type` |

`medium` and `materials` are required by the schema but no page displays them, so `TODO` in those two fields never reaches the site.

Exactly one `hero` image is required (enforced by `superRefine`). Change the schema and the transform together, then check every consumer of `data.hero`, `data.images[].type`, and `data.dimensions`.

The URL comes from the frontmatter `slug` field (`getStaticPaths` in `src/pages/artwork/[slug].astro`), not from the folder name. Keep the two identical.

`placeholder: true` marks a stub record whose details are still `TODO`. It only keeps the work out of the homepage's "Selected work"; the work is still listed everywhere else and still gets its page. Remove the flag when the record is filled in. A test fails if `TODO` text reaches the homepage, so do not set `featured` on a placeholder.

### Portfolio sections

`src/sections.ts` is the registry of portfolio sections (currently `bottles`, `statement`, `paintings`): an id and a label each. It is plain TypeScript with no `astro:` imports because the content schema, the pages, and the Vitest suite all import it. Array order is display order.

An artwork's `sections` frontmatter is a non-empty list of those ids, so one work can be listed in several sections. `status` (`available`, `unavailable`, or `sold`) is the work's availability, and it is optional. It is shown on the artwork page and in the card overlay described below, feeds the status filters on `/artwork`, and does not affect which sections a work is listed in. A work with no `status` (currently only Endeavor) shows no status anywhere and is hidden whenever a status filter is active. Its display labels are `statusLabels` in `src/lib/artworks.ts`.

Sections have no pages of their own. A section is a filter on `/artwork` and nothing else: no page shows which sections a work is in. Commissions are not a section either; the Commissions tab opens the contact form on the commission inquiry. Adding a section is one registry entry.

`/artwork` (`src/pages/artwork/index.astro`) lists every artwork with client-side filter buttons: one per section from the registry, plus one per status from `statusLabels`. Each card wrapper carries its tags in `data-filters`, and the inline script hides non-matching wrappers with the `hidden` attribute. Filters in the same `data-filter-group` are ORed, groups are ANDed.

Every list of artworks (the homepage "Selected work" and `/artwork`) uses the `.artwork-grid` class from `global.css`: an even three-column grid (two below `63.99rem`, one below `47.99rem`) where every `.artwork-frame` (the image link in `ArtworkCard`) is the same 4:5 box and the photograph is fitted inside it with `object-fit: contain`, so nothing is cropped and non-4:5 photographs get charcoal bands. Do not reintroduce staggered `nth-child` layouts for artwork lists; on `/artwork` filtered-out items would also leave holes in one. Single showcase images (homepage hero and featured block, the artwork page itself) are not in the grid.

`ArtworkCard` lays a dark overlay over the photograph on hover and on keyboard focus, showing the work's dimensions and, for `sold` and `unavailable` works, the status label; an available work, or one with no status, shows its dimensions alone. The overlay is a sibling of the image link with `pointer-events: none`, so the link stays clickable. Under `@media (hover: none)` the same element becomes a static line under the photograph, because touch screens have nothing to hover with.

### How pages select artworks

Every page that lists artworks gets them from `getSortedArtworks()` in `src/lib/artworks.ts` (`sortOrder` ascending, then `title`) and narrows to a section with `inSection()` from the same file. Change ordering there, not in the pages.

Several sections are driven by image roles and flags rather than hardcoded slugs, and they silently disappear when nothing qualifies:

- Homepage hero: first `featured` artwork. "Selected work": first six by sort order, skipping records flagged `placeholder: true`.
- Homepage "Surface / detail" and the featured block's extra images: need a featured artwork with `detail` / `angled` images.
- About page process image: first artwork with a `process` image.
- Contact form artwork list: every artwork, placeholders included, alphabetically by title.

No artwork has a `detail` or `process` image yet, and the artwork in the homepage featured block (Don Julio 1942) has no `angled` image, so the detail, angled, and process slots do not render yet. That is expected, not a bug.

### Images and the lightbox

All artwork imagery goes through `src/components/ArtworkImage.astro`, which wraps Astro's `<Picture>` (AVIF + WebP, widths 480 / 960 / up to 1600). Pass a `sizes` value that matches the layout slot.

With the `lightbox` prop it renders a `<button>` carrying `data-lightbox-*` attributes and pre-generates a larger WebP (up to 2200px). `src/components/Lightbox.astro` is mounted once in `BaseLayout.astro` and handles those buttons through a delegated click listener on `document`. The `gallery` prop sets the group that prev/next, arrow keys, and swipe cycle through; artwork pages use the slug, other pages use a per-section name.

Source photographs live next to their `artwork.md` (or in `src/assets/` for site-level images) and are imported, never placed in `public/`. Do not pre-resize or crop them for layout slots; keep the original aspect ratio at roughly 2000 to 3000px on the long edge.

### Layout and styling

`BaseLayout.astro` owns `<head>` (canonical URL, Open Graph, Organization JSON-LD built from `Astro.site`), the header, footer, and the lightbox. Site-wide strings such as the studio name, email, and Instagram come from `src/config.ts`.

Styling is plain CSS: design tokens and a few shared utility classes (`.page-shell`, `.page-header`, `.section`, `.section-label`, `.eyebrow`, `.large-copy`, `.text-link`, `.artwork-grid`) in `src/styles/global.css`, and everything else in scoped `<style>` blocks inside each page or component. Because `<Picture>` output belongs to a child component, scoped rules that target its `<img>` need `:global(img)`. The site is dark-only, and the main layout breakpoint is `47.99rem`.

Every nav tab page (`/artwork`, `/about`, `/contact`) opens with the same block, `.page-header` in `global.css`: an eyebrow, a centered `h1` at the global `h1` size, and a hairline along the bottom edge, so none of them jump when switching tabs. The header holds nothing else. `/artwork` and `/about` use the tab's one-word name as the title, which keeps their hairlines at the same height; `/contact` keeps its two-line phrase, so its header is taller. The statement line for `/about` sits below the hairline as a `.large-copy` paragraph. Above the main breakpoint the eyebrow is positioned absolutely in the top-left corner, centered on the `--page-eyebrow` token, which is derived from the header's top padding and the `h1` size; change those three together. Below the breakpoint the eyebrow returns to the flow at `--page-top`, centered above the title, and the title shrinks with the viewport so that "conversation." fits a 320px screen. A new tab page starts with `<header class="page-header page-shell">`.

Client behavior is vanilla TypeScript in Astro `<script>` blocks (the lightbox, the `/artwork` filters, and the contact form). Do not add a UI framework for this.

### URLs and trailing slashes

Every page is built as `<route>/index.html`, and Cloudflare serves it at `<route>/`. A request for `<route>` without the slash gets a 307 redirect first, which browsers do not cache, so a slash-less internal link costs a round trip on every click. Write every internal page link with the trailing slash, including before a query string: `/artwork/`, `` `/artwork/${slug}/` ``, `/contact/?type=commission`. File URLs (`/_astro/…`, anything with an extension) take no slash.

`trailingSlash: 'always'` in `astro.config.mjs` makes `astro dev` return 404 for a slash-less URL, so a missed slash shows up locally (typing `localhost:4321/contact` in dev 404s for the same reason). The per-page test "links to internal pages with a trailing slash" checks the built HTML, and `linkedRoutes()` in the tests compares links exactly as written. Canonical URLs already end in a slash; keep links, canonicals, and `public/_redirects` targets in the same form. In production, slash-less URLs typed by visitors or in old links still work through Cloudflare's redirect.

### Contact form

`/contact` is the single inquiry form, with three types: `artwork`, `commission`, and `general`. The header has two tabs into it: Contact links to `/contact/`, and Commissions links to `/contact/?type=commission`. `?type=` selects a type (anything else leaves none selected, and the form stays hidden until the visitor picks one); `?piece=<slug>` preselects the artwork, and each artwork page's "Ask about the work" link uses it. The old `/commissions` URL is a 302 to `/contact/?type=commission` in `public/_redirects` (make it 301 at launch); `astro dev` and `astro preview` ignore that file, so test it with `npx wrangler dev`.

`src/inquiry.ts` is plain TypeScript, like `src/sections.ts`, holding the types, the size, budget, and timing options, `validateInquiry()`, and `formatInquiry()` (the message the studio would receive). The page script validates with it, and a future endpoint should import the same functions rather than re-implement them. `budgetRanges` are placeholders until the artist sets pricing.

Each part of the form carries `data-for="<type ids>"`. CSS `:has()` rules in `contact.astro` show only the parts for the checked type, and those rules name the three ids, so update them if a type is added. The page script disables the hidden fieldsets so their required fields neither block nor get submitted. An inline script right after the type chooser checks the `?type=` radio before the rest of the form is drawn.

There is no backend. `sendInquiry()` in `contact.astro`, marked `BACKEND HOOK`, returns `'unavailable'`, and the page then tells the visitor to email the studio instead. Connecting it needs a domain on Cloudflare (for the Email Routing `send_email` binding) or a hosted form service; see TODO.md. Uploads are not supported.

## Content conventions

- `TODO.md` tracks open questions for the artist and for the build. Add new ones there instead of only raising them in conversation, and tick or remove them once answered.
- `.draft-note` spans mark copy that still needs the artist's review. Leave them in place unless the copy has been approved.
- The contact email in `src/config.ts` is the studio's real address; the contact page and the footer both read it from there.
- Alt text describes what is visible and what the photograph adds, rather than repeating the artwork title. An angled view should mention depth or projection.

## Deployment state

The site is currently on a temporary Cloudflare Workers static-assets deployment for testing: `wrangler.jsonc` serves `./dist` and returns `404.html` for unknown paths (`not_found_handling`), and `site` in `astro.config.mjs` points at the matching `workers.dev` URL, `https://glizzy-enjoyer.theshoeman1224.workers.dev`. A `workers.dev` host is `<worker name>.<account subdomain>.workers.dev`; the test "publishes canonical URLs on the deployed host" checks the Worker name against `wrangler.jsonc`, but only a deploy shows whether the account subdomain is right. `wrangler` is not a dependency in `package.json`, so deploying is `npm run build` followed by `npx wrangler deploy`.

Indexing is deliberately blocked while this is temporary, through `public/robots.txt` (`Disallow: /`) and `public/_headers` (`X-Robots-Tag: noindex`). Launching publicly means deleting `robots.txt`, removing the `X-Robots-Tag` rule from `_headers`, and setting `site` to the final canonical domain.

`public/_headers` also sends `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*`, which is permanent. It relies on every file there having a content hash in its name, which Astro's build guarantees for bundled CSS and JS and for imported images. Anything in `public/` keeps its name across changes, so never add long-lived caching for those paths, and never put a hand-named file under `/_astro/`.

The README also documents a Cloudflare Pages setup (build command `npm run build`, output `dist`) with staging protected by Cloudflare Access. Authentication stays outside the app: do not add login pages, sessions, passwords, or access tokens to this repository.
