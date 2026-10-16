# Image quality comparison

A local page for judging image compression before it reaches the site. Each artwork photograph sits next to the AVIF and WebP files the site would make from it, at whatever quality you choose, with synchronized 1:1 and 2× zoom.

It is a development tool only. Nothing in `tools/` is imported by the site, so it never reaches `dist/` or the deployment, and its output goes to `.image-compare/`, which git ignores.

## Start it

From the repository root (Node.js 22+, after `npm install`):

```bash
npm run compare                                  # Every artwork, at the qualities the site uses today
npm run compare -- --avif 60 --webp 80           # Preview other qualities
npm run compare -- --only riptide,undertow       # Only these artworks (slugs from artwork.md)
npm run compare -- --only my-new-piece --avif 60 --webp 80
```

Then open the address it prints, normally **http://127.0.0.1:4390/**. Press `Ctrl+C` to stop the server.

| Option | Default | |
| --- | --- | --- |
| `--avif <1-100>` | the site's | AVIF quality to preview |
| `--webp <1-100>` | the site's | WebP quality to preview |
| `--only <slugs>` | every artwork | Comma-separated artwork slugs |
| `--port <number>` | `4390` | Port for the local server. `astro dev` and `astro preview` take 4321, then 4322 and up when it is busy |
| `--no-serve` | | Write `.image-compare/` and exit |
| `--help` | | List the options |

A full run encodes about 200 files and takes a minute or two. Encoded files are cached in `.image-compare/images/` by photograph, width, and quality, so running again, or switching back to a quality you have already tried, is quick. `rm -rf .image-compare` clears the cache. The server lets the browser keep every image, as the live site does, so revisiting the page is quick too.

## Using the page

- **Size** picks which srcset width to compare: small (480 px) is phones in the grid, medium (960 px) the grid on most screens, large (up to 1600 px) the artwork page hero.
- **Zoom** 1:1 shows one image pixel per screen pixel, and 2× doubles that. Move the pointer over any of the three panes, or drag on a touch screen, to pan all of them together.
- When the preview quality differs from the site's, each AVIF caption shows the size at the site's quality and the saving.
- Works marked **full resolution** (`fullResolution: true` in `artwork.md`) are served as supplied on the site. Their compressed panes show what removing the flag would look like.
- `?size=0`–`2` and `?zoom=0`–`2` in the address set the starting view, and `?eager` loads every image at once (for screenshots).

## What to look for

Deep blacks, dark gradients, detail in shadows, gold leaf, and other metallic sheen are where compression shows first. If a new piece looks visibly worse than its original at 1:1, consider `fullResolution: true` for it (CLAUDE.md, "Artwork content collection").

## Keeping it accurate

The page is only useful if it shows exactly what the build produces:

- `compare.mjs` reads the site's qualities and widths from `src/components/ArtworkImage.astro`, and exits with an error if that code has changed shape. Update `siteSettings()` to match.
- `encode()` mirrors Astro's sharp image service (rotate, resize with the same width and height, then encode with a quality and nothing else). When it was written, against Astro 7.2.9, every AVIF and WebP file it produced was byte-identical to the build's. After an Astro or sharp upgrade, run `npm run build`, then `npm run compare -- --only riptide --no-serve`, and check that `.image-compare/images/` holds files identical to the ones `dist/artwork/riptide/index.html` references.
