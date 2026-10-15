import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://glizzy-enjoyer.workers.dev',
  // Pages are built as <route>/index.html, which Cloudflare serves at <route>/ and reaches from <route> only
  // through a redirect. Internal links therefore end in a slash, and this makes the dev server enforce it.
  trailingSlash: 'always',
  image: {
    responsiveStyles: true,
  },
});
