import { defineConfig } from 'astro/config';

export default defineConfig({
  // A workers.dev address is <worker name>.<account subdomain>.workers.dev; a test checks the worker name.
  site: 'https://glizzy-enjoyer.theshoeman1224.workers.dev',
  // Pages are built as <route>/index.html, which Cloudflare serves at <route>/ and reaches from <route> only
  // through a redirect. Internal links therefore end in a slash, and this makes the dev server enforce it.
  trailingSlash: 'always',
  image: {
    responsiveStyles: true,
  },
});
