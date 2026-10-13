# Endeavor Art Studio

A static-first portfolio for a mixed-media artist. The site uses Astro, TypeScript, repository-native artwork records, and a small framework-free lightbox.

Artist-provided copy, artwork records, and photography are in place. Contact details in `src/config.ts` are still provisional until launch.

## Repository structure

```text
src/
  assets/                  Site-level images: artist portrait and studio emblem
  components/              Shared image, navigation, and lightbox components
  content/artworks/<slug>/ Portable artwork package: metadata and images
  layouts/BaseLayout.astro
  pages/                   Astro routes
  lib/artworks.ts          Shared artwork sorting and section filtering
  styles/global.css        Design tokens and global rules
  config.ts                Email, Instagram, and site-level content
  sections.ts              Portfolio sections: ids and labels
  content.config.ts        Artwork schema and validation
public/
  _headers                 Temporary noindex response header
  robots.txt               Temporary crawler block
astro.config.mjs           Canonical site URL and image settings
wrangler.jsonc             Cloudflare Workers static-assets deployment
```

Astro generates these routes from the files above:

```text
/
/artwork
/artwork/<artwork-slug>
/about
/commissions
/contact
/404
```

## Local development

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Astro prints the local URL, normally `http://localhost:4321`.

Useful commands:

```bash
npm run check       # TypeScript, Astro, and content validation
npm run build       # Validation followed by the production build
npm run preview     # Serve the production build locally
npm test            # Build, then run the build output tests
```

The production output is written to `dist/`.

## Tests

`npm test` builds the site and then runs the Vitest suite in `tests/` against the generated HTML in `dist/`. The tests check that:

- the top-level pages exist, and every artwork record has exactly one `/artwork/<slug>` page that `/artwork` lists and links to
- every page has a language, title, description, a single `h1`, and a canonical URL matching its route
- every image has an `alt` attribute, and every artwork photograph has a non-empty description
- every internal link, image, stylesheet, and in-page anchor points at something that exists in the build

To re-run the tests against an existing build without rebuilding, use `npx vitest run`.

## Add an artwork

1. Create `src/content/artworks/<slug>/`.
2. Add `artwork.md` using `src/content/artworks/after-the-break/artwork.md` as the model.
3. Put the hero and any detail, angled, environment, or process photographs in the same folder.
4. Reference each photograph with a relative path such as `./hero.png` and assign its role.
5. List the portfolio sections the work belongs to under `sections`.
6. Run `npm run check`.

The artwork will appear on `/artwork`, under the filter of every section it lists, and Astro will create `/artwork/<slug>`. Set `featured: true` to make the record eligible for featured placements. The homepage displays the first six records.

Do not manually resize source photographs for layout slots. Keep their original aspect ratios and enough resolution to show material texture. Astro creates responsive AVIF, WebP, and fallback files at build time. A practical source target is 2000 to 3000 pixels on the long edge. Avoid uploading camera-original files that are much larger unless fine detail requires them.

## Artwork schema

The validated schema lives in `src/content.config.ts`. Real artworks use the portable package format.

| Field | Type | Purpose |
| --- | --- | --- |
| `schemaVersion` | `1` | Version of the portable package format |
| `title` | string | Display title |
| `slug` | string | Lowercase URL segment with hyphens |
| `year` | integer | Completion year |
| `medium` | string | Primary medium label |
| `materials` | string array | Physical materials used |
| `dimensions` | object | Numeric height, width, optional depth, and unit |
| `description` | string | Artwork description |
| `status` | enum | Availability: available, unavailable, or sold |
| `sections` | enum array | Portfolio sections the work is listed in, at least one |
| `images` | image array | All photographs, relative paths, alt text, and roles |
| `featured` | boolean | Eligible for featured placement |
| `instagramUrl` | optional URL | Link to a post about this work |
| `sortOrder` | integer | Portfolio display order |

Allowed `status` values:

```text
available
unavailable
sold
```

`status` is the work's availability. It is shown on the artwork page, and wherever artworks are listed, hovering a photograph (or focusing it with the keyboard) shows the work's dimensions over it, followed by "Sold" or "Unavailable"; an available work shows its dimensions alone. On touch screens the same line sits under the photograph. `status` does not decide where the work is listed; `sections` does.

Allowed `sections` values:

```text
bottles
statement
paintings
```

A work can list more than one section, for example a bottle piece that is also a statement piece.

Allowed image roles:

```text
hero
detail
angled
environment
process
```

Each package must contain exactly one `hero` image. Example:

```yaml
dimensions:
  height: 36
  width: 24
  unit: in
sections:
  - bottles
  - statement
images:
  - src: ./hero.png
    role: hero
    alt: "Vertical black textured artwork crossed by reflective gold leaf"
```

Alt text should describe what is visible and what the photograph contributes. Avoid repeating only the artwork title. An angled view should mention depth or projection when that is the reason for the image.

## Add a portfolio section

1. Add an entry to the list in `src/sections.ts`. Its `id` is the value used in artwork records, and the list order is the display order.
2. Run `npm test`.

The new section then appears as a filter on `/artwork` and as an allowed `sections` value.

## Artwork filters

`/artwork` lists every work with filter buttons: one per portfolio section, plus one per `status` (Available, Unavailable, Sold). Nothing is filtered until a button is pressed, and Clear resets them all. Filters of the same kind widen each other (Bottles and Paintings shows both, Available and Sold shows both); a section filter and a status filter together narrow the result to works that match both, such as available bottles.

## Contact configuration

Update `src/config.ts` before sharing the site with real visitors:

```ts
export const siteConfig = {
  title: 'Endeavor Art Studio',
  legalName: 'Endeavor Art Studio, LLC',
  description: 'Mixed-media art exploring texture, material, and transformation.',
  email: 'artist@example.com',
  instagram: 'https://www.instagram.com/endeavor.artstudio/',
  instagramHandle: '@endeavor.artstudio',
};
```

Also replace the provisional `site` URL in `astro.config.mjs` with the final canonical domain.

## Current deployment: Cloudflare Workers (temporary)

The site is currently deployed for testing as a Cloudflare Worker that serves static assets. `wrangler.jsonc` defines the Worker (`glizzy-enjoyer`) and points its asset directory at `./dist`. The `site` value in `astro.config.mjs` is set to the matching `https://glizzy-enjoyer.workers.dev` address so canonical URLs and structured data resolve correctly.

Wrangler is not a project dependency. To deploy from a local checkout:

```bash
npm run build
npx wrangler deploy
```

If the Worker is connected to the repository through Workers Builds, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command.

No Astro adapter is needed. The output is static HTML, CSS, JavaScript, fonts, and optimized images.

While the deployment is temporary, two files in `public/` keep it out of search results:

- `robots.txt` disallows all crawlers.
- `_headers` adds `X-Robots-Tag: noindex, nofollow, noarchive` to every response.

These only discourage indexing. The `workers.dev` address is still reachable by anyone who has the link.

Before the public launch:

1. Delete `public/robots.txt` and `public/_headers`, or replace them with production rules.
2. Set `site` in `astro.config.mjs` to the final canonical domain.
3. Replace the placeholder email in `src/config.ts`.

The two sections below describe the Cloudflare Pages setup with Access-protected staging. They do not apply to the temporary Workers deployment.

## Cloudflare Pages deployment

1. Push the project to a private GitHub repository.
2. In Cloudflare, create a Pages project and connect that repository.
3. Choose no framework preset or the Astro preset.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Set `NODE_VERSION` to `22` or newer if the build environment does not select it automatically.
7. Deploy and verify the generated `/artwork/<slug>` pages directly, not only through client navigation.

No Astro adapter is needed. The output is static HTML, CSS, JavaScript, fonts, and optimized images.

## Cloudflare Access for private staging

Keep authentication outside the application:

1. Put the Pages project on a staging hostname that Cloudflare proxies, such as `studio-preview.example.com`.
2. In Cloudflare Zero Trust, open **Access controls > Applications** and add a self-hosted application for that hostname.
3. Add an allow policy for the artist and approved reviewers. Use specific email addresses, an approved email domain, or the chosen identity provider group.
4. Keep the default deny behavior for everyone else.
5. In the Pages project, open **Settings > General** and enable an Access policy for preview deployments. Preview URLs are public by default.
6. Follow Cloudflare's current Pages known-issues guidance to protect the project's main `*.pages.dev` domain as well as the custom hostname. Protecting only the custom hostname leaves the Pages address reachable.
7. Test the custom hostname, the main `pages.dev` address, and a hash-based preview URL in a private browser session before sharing the staging site. Each must present an Access challenge.

Cloudflare Access protects the staging hostname before requests reach the static site. Do not add login pages, sessions, passwords, or access tokens to this repository.

When the public site launches, use a separate public hostname or remove the Access policy from the production hostname. Keep the `pages.dev` and preview deployment policies in place if those URLs contain unpublished work.

Cloudflare changes dashboard labels and Pages restrictions over time. Confirm the setup against the current [Pages preview deployment documentation](https://developers.cloudflare.com/pages/configuration/preview-deployments/) and [Pages known issues](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).
