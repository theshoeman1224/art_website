# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Endeavor Art Studio: a static Astro 7 portfolio site for a mixed-media artist. No UI framework, no adapter, no server code. Output is plain HTML/CSS/JS plus build-time optimized images.

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

The Vitest suite in `tests/` does not test source modules. It parses the HTML that `astro build` wrote to `dist/` and checks routes, document metadata, canonical URLs, image alt text, and that every internal link, asset, and anchor resolves. It therefore needs a current build:

```bash
npm test                              # Rebuild, then run everything
npx vitest run                        # Run against the existing dist/ without rebuilding
npx vitest run -t "page /about/"      # Run the tests for one page
```

Per-page tests are generated from whatever HTML files are in `dist/`, so new pages are covered automatically. `tests/site.ts` holds the helpers; its `artworkSlugs()` is the only place the tests read source content, and it must be updated if artwork records move or change format. The suite also imports `sectionIds` from `src/sections.ts` to tell section pages apart from artwork pages under `/work/`.

## Architecture

### Artwork content collection

Each artwork is a self-contained folder, `src/content/artworks/<slug>/`, holding `artwork.md` (frontmatter only) and its photographs. Adding a folder is all it takes to publish a work: it appears on the page of every section it lists and gets a `/work/<slug>` page.

The schema in `src/content.config.ts` validates the frontmatter and then **transforms** it, so the shape pages read from `artwork.data` differs from what is written in `artwork.md`:

| Frontmatter | `artwork.data` |
| --- | --- |
| `dimensions: { height, width, depth?, unit }` | `dimensions` is a display string such as `36 × 24 in` |
| `images[]` entry with `role: hero` | pulled out into `hero: { src, alt }` |
| remaining `images[]` entries, each with `role` | `images[]` without the hero, and `role` renamed to `type` |

Exactly one `hero` image is required (enforced by `superRefine`). Change the schema and the transform together, then check every consumer of `data.hero`, `data.images[].type`, and `data.dimensions`.

The URL comes from the frontmatter `slug` field (`getStaticPaths` in `src/pages/work/[slug].astro`), not from the folder name. Keep the two identical.

`placeholder: true` marks a stub record whose details are still `TODO`. It only keeps the work out of the homepage's "Selected work"; the work is still listed everywhere else and still gets its page. Remove the flag when the record is filled in. A test fails if `TODO` text reaches the homepage, so do not set `featured` on a placeholder.

### Portfolio sections

`src/sections.ts` is the registry of portfolio sections (currently `bottles`, `commissions`, `paintings`): id, label, description, and an optional call-to-action link. It is plain TypeScript with no `astro:` imports because the content schema, the pages, and the Vitest suite all import it. Array order is display order.

An artwork's `sections` frontmatter is a non-empty list of those ids, so one work can be listed in several sections. `status` (including `status: commission`) is only the ownership label on the artwork page and does not affect listing.

Each section has a page at `/work/<id>`. These are static stubs (`src/pages/work/bottles.astro` and so on) that render `src/components/SectionPage.astro`, because a second dynamic route would collide with `[slug].astro`. Section ids and artwork slugs therefore share one URL space, and the schema rejects an artwork whose `slug` equals a section id. Adding a section means a registry entry plus a stub. `/work` itself is a landing page with one tile per section.

`/artwork` (`src/pages/artwork.astro`) lists every artwork with client-side filter buttons: one per section from the registry, plus Available (`status: available`). Each card wrapper carries its tags in `data-filters`, and the inline script hides non-matching wrappers with the `hidden` attribute. Filters in the same `data-filter-group` are ORed, groups are ANDed.

Every list of artworks (the homepage "Selected work", the `/work` section tiles, the section pages, and `/artwork`) uses the `.artwork-grid` class from `global.css`: an even three-column grid (two below `63.99rem`, one below `47.99rem`) where every `.artwork-frame` (the image link in `ArtworkCard` and in the `/work` tiles) is the same 4:5 box and the photograph is fitted inside it with `object-fit: contain`, so nothing is cropped and non-4:5 photographs get charcoal bands. Do not reintroduce staggered `nth-child` layouts for artwork lists; on `/artwork` filtered-out items would also leave holes in one. Single showcase images (homepage hero and featured block, commissions rotator, the artwork page itself) are not in the grid.

### How pages select artworks

Every page that lists artworks gets them from `getSortedArtworks()` in `src/lib/artworks.ts` (`sortOrder` ascending, then `title`) and narrows to a section with `inSection()` from the same file. Change ordering there, not in the pages.

Several sections are driven by image roles and flags rather than hardcoded slugs, and they silently disappear when nothing qualifies:

- Homepage hero: first `featured` artwork. "Selected work": first six by sort order, skipping records flagged `placeholder: true`.
- Homepage "Surface / detail" and the featured block's extra images: need a featured artwork with `detail` / `angled` images.
- About page process image: first artwork with a `process` image.
- Commissions hero rotator: all artworks in the `commissions` section.
- `/work` section tiles: each uses the first artwork in its section as the lead image, skipping one an earlier tile already shows. A section with no artworks keeps its tile and page but has no image.

No artwork has a `detail` or `process` image yet, and the artwork in the homepage featured block (Worth the Break) has no `angled` image, so the detail, angled, and process slots do not render yet. That is expected, not a bug.

### Images and the lightbox

All artwork imagery goes through `src/components/ArtworkImage.astro`, which wraps Astro's `<Picture>` (AVIF + WebP, widths 480 / 960 / up to 1600). Pass a `sizes` value that matches the layout slot.

With the `lightbox` prop it renders a `<button>` carrying `data-lightbox-*` attributes and pre-generates a larger WebP (up to 2200px). `src/components/Lightbox.astro` is mounted once in `BaseLayout.astro` and handles those buttons through a delegated click listener on `document`. The `gallery` prop sets the group that prev/next, arrow keys, and swipe cycle through; artwork pages use the slug, other pages use a per-section name.

Source photographs live next to their `artwork.md` (or in `src/assets/` for site-level images) and are imported, never placed in `public/`. Do not pre-resize or crop them for layout slots; keep the original aspect ratio at roughly 2000 to 3000px on the long edge.

### Layout and styling

`BaseLayout.astro` owns `<head>` (canonical URL, Open Graph, Organization JSON-LD built from `Astro.site`), the header, footer, and the lightbox. Site-wide strings such as the studio name, email, and Instagram come from `src/config.ts`.

Styling is plain CSS: design tokens and a few shared utility classes (`.page-shell`, `.section`, `.section-label`, `.eyebrow`, `.large-copy`, `.text-link`, `.artwork-grid`) in `src/styles/global.css`, and everything else in scoped `<style>` blocks inside each page or component. Because `<Picture>` output belongs to a child component, scoped rules that target its `<img>` need `:global(img)`. The site is dark-only, and the main layout breakpoint is `47.99rem`.

Client behavior is vanilla TypeScript in Astro `<script>` blocks (the lightbox, the commissions hero rotator, and the `/artwork` filters). Do not add a UI framework for this.

## Content conventions

- `TODO.md` tracks open questions for the artist and for the build. Add new ones there instead of only raising them in conversation, and tick or remove them once answered.
- `.draft-note` spans mark copy that still needs the artist's review. Leave them in place unless the copy has been approved.
- The email in `src/config.ts` is a placeholder (`@example.com`), and the contact page says so. Both get updated together at launch.
- Alt text describes what is visible and what the photograph adds, rather than repeating the artwork title. An angled view should mention depth or projection.

## Deployment state

The site is currently on a temporary Cloudflare Workers static-assets deployment for testing: `wrangler.jsonc` serves `./dist` and returns `404.html` for unknown paths (`not_found_handling`), and `site` in `astro.config.mjs` points at the matching `workers.dev` URL. `wrangler` is not a dependency in `package.json`, so deploying is `npm run build` followed by `npx wrangler deploy`.

Indexing is deliberately blocked while this is temporary, through `public/robots.txt` (`Disallow: /`) and `public/_headers` (`X-Robots-Tag: noindex`). Launching publicly means removing both and setting `site` to the final canonical domain.

The README also documents a Cloudflare Pages setup (build command `npm run build`, output `dist`) with staging protected by Cloudflare Access. Authentication stays outside the app: do not add login pages, sessions, passwords, or access tokens to this repository.
