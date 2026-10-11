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

Per-page tests are generated from whatever HTML files are in `dist/`, so new pages are covered automatically. `tests/site.ts` holds the helpers; its `artworkSlugs()` is the only place the tests read source content, and it must be updated if artwork records move or change format.

## Architecture

### Artwork content collection

Each artwork is a self-contained folder, `src/content/artworks/<slug>/`, holding `artwork.md` (frontmatter only) and its photographs. Adding a folder is all it takes to publish a work: it appears on `/work` and gets a `/work/<slug>` page.

The schema in `src/content.config.ts` validates the frontmatter and then **transforms** it, so the shape pages read from `artwork.data` differs from what is written in `artwork.md`:

| Frontmatter | `artwork.data` |
| --- | --- |
| `dimensions: { height, width, depth?, unit }` | `dimensions` is a display string such as `36 × 24 in` |
| `images[]` entry with `role: hero` | pulled out into `hero: { src, alt }` |
| remaining `images[]` entries, each with `role` | `images[]` without the hero, and `role` renamed to `type` |

Exactly one `hero` image is required (enforced by `superRefine`). Change the schema and the transform together, then check every consumer of `data.hero`, `data.images[].type`, and `data.dimensions`.

The URL comes from the frontmatter `slug` field (`getStaticPaths` in `src/pages/work/[slug].astro`), not from the folder name. Keep the two identical.

### How pages select artworks

Every page that lists artworks repeats the same sort inline: `sortOrder` ascending, then `title`. There is no shared helper, so a change to ordering has to be made in `index.astro`, `work/index.astro`, `about.astro`, and `commissions.astro`.

Several sections are driven by image roles and flags rather than hardcoded slugs, and they silently disappear when nothing qualifies:

- Homepage hero: first `featured` artwork. "Selected work": first six by sort order.
- Homepage "Surface / detail" and the featured block's extra images: need a featured artwork with `detail` / `angled` images.
- About page process image: first artwork with a `process` image.
- Commissions hero rotator: all artworks with `commission: true`.

The current three artworks only have hero images, so the detail, angled, and process slots do not render yet. That is expected, not a bug.

### Images and the lightbox

All artwork imagery goes through `src/components/ArtworkImage.astro`, which wraps Astro's `<Picture>` (AVIF + WebP, widths 480 / 960 / up to 1600). Pass a `sizes` value that matches the layout slot.

With the `lightbox` prop it renders a `<button>` carrying `data-lightbox-*` attributes and pre-generates a larger WebP (up to 2200px). `src/components/Lightbox.astro` is mounted once in `BaseLayout.astro` and handles those buttons through a delegated click listener on `document`. The `gallery` prop sets the group that prev/next, arrow keys, and swipe cycle through; artwork pages use the slug, other pages use a per-section name.

Source photographs live next to their `artwork.md` (or in `src/assets/` for site-level images) and are imported, never placed in `public/`. Do not pre-resize or crop them for layout slots; keep the original aspect ratio at roughly 2000 to 3000px on the long edge.

### Layout and styling

`BaseLayout.astro` owns `<head>` (canonical URL, Open Graph, Organization JSON-LD built from `Astro.site`), the header, footer, and the lightbox. Site-wide strings such as the studio name, email, and Instagram come from `src/config.ts`.

Styling is plain CSS: design tokens and a few shared utility classes (`.page-shell`, `.section`, `.section-label`, `.eyebrow`, `.large-copy`, `.text-link`) in `src/styles/global.css`, and everything else in scoped `<style>` blocks inside each page or component. Because `<Picture>` output belongs to a child component, scoped rules that target its `<img>` need `:global(img)`. The site is dark-only, and the main layout breakpoint is `47.99rem`.

Client behavior is vanilla TypeScript in Astro `<script>` blocks (the lightbox, and the commissions hero rotator). Do not add a UI framework for this.

## Content conventions

- `.draft-note` spans mark copy that still needs the artist's review. Leave them in place unless the copy has been approved.
- The email in `src/config.ts` is a placeholder (`@example.com`), and the contact page says so. Both get updated together at launch.
- Alt text describes what is visible and what the photograph adds, rather than repeating the artwork title. An angled view should mention depth or projection.

## Deployment state

The site is currently on a temporary Cloudflare Workers static-assets deployment for testing: `wrangler.jsonc` serves `./dist`, and `site` in `astro.config.mjs` points at the matching `workers.dev` URL. `wrangler` is not a dependency in `package.json`, so deploying is `npm run build` followed by `npx wrangler deploy`.

Indexing is deliberately blocked while this is temporary, through `public/robots.txt` (`Disallow: /`) and `public/_headers` (`X-Robots-Tag: noindex`). Launching publicly means removing both and setting `site` to the final canonical domain.

The README also documents a Cloudflare Pages setup (build command `npm run build`, output `dist`) with staging protected by Cloudflare Access. Authentication stays outside the app: do not add login pages, sessions, passwords, or access tokens to this repository.
