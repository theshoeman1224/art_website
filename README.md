# Endeavor Art Studio

A static-first portfolio for a mixed-media artist. The site uses Astro, TypeScript, repository-native artwork records, and a small framework-free lightbox.

All artwork records, artwork images, artist copy, and contact details currently in the repository are placeholders. The site marks them visibly so they cannot be mistaken for artist-provided information.

## Repository structure

```text
src/
  assets/
    artworks/<slug>/       Artwork photography, grouped by artwork
    artist-placeholder.jpg
  components/              Shared image, navigation, and lightbox components
  content/artworks/        One Markdown metadata record per artwork
  layouts/BaseLayout.astro
  pages/                   Astro routes
  styles/global.css        Design tokens and global rules
  config.ts                Email, Instagram, and site-level content
scripts/
  generate-placeholders.mjs
astro.config.mjs
```

Astro generates these routes from the files above:

```text
/
/work
/work/<artwork-slug>
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
```

The production output is written to `dist/`.

## Add an artwork

1. Create `src/assets/artworks/<slug>/`.
2. Add the full artwork photograph as `hero.jpg`, `hero.png`, or another format Astro supports.
3. Add any detail, angled, environment, and process photographs in the same directory.
4. Copy one record in `src/content/artworks/` to `<slug>.md`.
5. Replace every field, set `placeholder: false`, and run `npm run check`.

The artwork will appear on `/work` and Astro will create `/work/<slug>`. Set `featured: true` to make the record eligible for featured placements. The current homepage selection uses all six records because the MVP contains six samples.

Do not manually resize source photographs for layout slots. Keep their original aspect ratios and enough resolution to show material texture. Astro creates responsive AVIF, WebP, and fallback files at build time. A practical source target is 2000 to 3000 pixels on the long edge. Avoid uploading camera-original files that are much larger unless fine detail requires them.

## Artwork schema

The validated schema lives in `src/content.config.ts`.

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | string | Display title |
| `slug` | string | Lowercase URL segment with hyphens |
| `year` | integer | Completion year |
| `medium` | string | Primary medium label |
| `materials` | string array | Physical materials used |
| `dimensions` | string | Display-ready dimensions including units |
| `description` | string | Artwork description |
| `status` | enum | Collection or availability state |
| `commission` | boolean | Whether the work originated as a commission |
| `hero.src` | local image | Primary full artwork view |
| `hero.alt` | string | Meaningful description of the image |
| `images` | image array | Additional photographs and their roles |
| `featured` | boolean | Eligible for featured placement |
| `instagramUrl` | optional URL | Link to a post about this work |
| `sortOrder` | integer | Portfolio display order |
| `placeholder` | boolean | Enables visible sample-content notices |

Allowed `status` values:

```text
artist_collection
private_collection
commission
available
not_for_sale
```

Allowed additional image roles:

```text
detail
angled
environment
process
```

Example image entry:

```yaml
images:
  - src: ../../assets/artworks/example/detail.jpg
    alt: "Close view of translucent glass held in textured resin"
    type: detail
```

Alt text should describe what is visible and what the photograph contributes. Avoid repeating only the artwork title. An angled view should mention depth or projection when that is the reason for the image.

## Placeholder media

`npm run generate:placeholders` regenerates the current sample artwork and portrait files. It is only a preview aid. Remove the generator and sample records after real photography replaces them.

## Contact configuration

Update `src/config.ts` before sharing the site with real visitors:

```ts
export const siteConfig = {
  title: 'Endeavor Art Studio',
  description: 'Mixed-media art exploring texture, material, and transformation.',
  email: 'artist@example.com',
  instagram: 'https://www.instagram.com/account/',
};
```

Also replace the provisional `site` URL in `astro.config.mjs` with the final canonical domain.

## Cloudflare Pages deployment

1. Push the project to a private GitHub repository.
2. In Cloudflare, create a Pages project and connect that repository.
3. Choose no framework preset or the Astro preset.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Set `NODE_VERSION` to `22` or newer if the build environment does not select it automatically.
7. Deploy and verify the generated `/work/<slug>` pages directly, not only through client navigation.

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
