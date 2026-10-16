// Builds a local page that puts each artwork photograph next to the AVIF and WebP files the site would make from it,
// at a quality of your choosing, and serves it on localhost. Nothing here is part of the site build: see README.md.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { availableParallelism } from 'node:os';
import { extname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../..', import.meta.url));
const toolDir = fileURLToPath(new URL('.', import.meta.url));
const artworksDir = join(root, 'src/content/artworks');
const outDir = join(root, '.image-compare');
const imagesDir = join(outDir, 'images');

const { values: args } = parseArgs({
  options: {
    avif: { type: 'string' },
    webp: { type: 'string' },
    only: { type: 'string' },
    port: { type: 'string', default: '4390' },
    'no-serve': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (args.help) {
  console.log(`Usage: npm run compare -- [options]

  --avif <1-100>    AVIF quality to preview (default: the site's, from ArtworkImage.astro)
  --webp <1-100>    WebP quality to preview (default: the site's)
  --only <slugs>    Comma-separated artwork slugs, e.g. riptide,undertow (default: every artwork)
  --port <number>   Port for the local server (default: 4390)
  --no-serve        Write .image-compare/ and exit without serving it`);
  process.exit(0);
}

// The site's settings, read from the component so this page always starts from what visitors get.
async function siteSettings() {
  const component = await readFile(join(root, 'src/components/ArtworkImage.astro'), 'utf8');
  const quality = component.match(/const quality = \{ avif: (\d+), webp: (\d+), fallback: (\d+) \}/);
  const widths = component.match(/\[480, 960, Math\.min\(src\.width, 1600\)\]/);
  if (!quality || !widths) {
    throw new Error('ArtworkImage.astro no longer matches what tools/image-compare/compare.mjs expects. Update siteSettings().');
  }
  return { avif: Number(quality[1]), webp: Number(quality[2]), widths: [480, 960], maxWidth: 1600 };
}

function quality(value, fallback, name) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) throw new Error(`--${name} must be a whole number from 1 to 100.`);
  return number;
}

// The few frontmatter fields this page needs. A malformed record fails `npm run check`, not this.
async function artworks() {
  const folders = (await readdir(artworksDir, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const records = await Promise.all(folders.map(async (folder) => {
    const dir = join(artworksDir, folder.name);
    const source = await readFile(join(dir, 'artwork.md'), 'utf8');
    const field = (name) => source.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
    return {
      dir,
      title: field('title') ?? folder.name,
      slug: field('slug') ?? folder.name,
      fullResolution: field('fullResolution') === 'true',
      photographs: [...source.matchAll(/^\s*-?\s*src:\s*["']?\.\/([^"'\s]+)/gm)].map((match) => join(dir, match[1])),
    };
  }));
  return records.sort((a, b) => a.title.localeCompare(b.title));
}

// Mirrors Astro's sharp service for a srcset entry: honour EXIF orientation, resize to the width with the height
// that keeps the aspect ratio, then encode with nothing but a quality. Check it still matches after Astro upgrades.
async function encode(file, width, height, format, q, target) {
  if (await exists(target)) return (await stat(target)).size;
  const data = await sharp(file, { failOn: 'none', pages: -1 })
    .rotate()
    .resize({ width, height, withoutEnlargement: true })
    [format]({ quality: q })
    .toBuffer();
  await writeFile(target, data);
  return data.length;
}

async function exists(path) {
  return stat(path).then(() => true, () => false);
}

async function compare(work, file, settings, site) {
  const original = await readFile(file);
  const hash = createHash('sha256').update(original).digest('hex').slice(0, 10);
  const { width, height } = await sharp(original).metadata().then((meta) =>
    (meta.orientation ?? 1) >= 5 ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height });
  const stem = `${work.slug}__${relative(work.dir, file).split(sep).join('_')}`.replace(/\.[^.]+$/, '');
  const originalName = `${stem}.${hash}${extname(file).toLowerCase()}`;
  if (!(await exists(join(imagesDir, originalName)))) await copyFile(file, join(imagesDir, originalName));

  const widths = [...new Set([...site.widths, Math.min(width, site.maxWidth)])].filter((w) => w <= width).sort((a, b) => a - b);
  const variants = [];
  for (const w of widths) {
    const h = Math.round((w * height) / width);
    const target = (format, q) => `${stem}.${hash}.${w}.q${q}.${format}`;
    const [avif, webp, siteAvif] = await Promise.all([
      encode(file, w, h, 'avif', settings.avif, join(imagesDir, target('avif', settings.avif))),
      encode(file, w, h, 'webp', settings.webp, join(imagesDir, target('webp', settings.webp))),
      settings.avif === site.avif
        ? undefined
        : encode(file, w, h, 'avif', site.avif, join(imagesDir, target('avif', site.avif))),
    ]);
    variants.push({
      width: w,
      avif: { file: `images/${target('avif', settings.avif)}`, bytes: avif },
      webp: { file: `images/${target('webp', settings.webp)}`, bytes: webp },
      siteAvifBytes: siteAvif,
    });
  }
  return {
    title: work.title,
    slug: work.slug,
    fullResolution: work.fullResolution,
    path: relative(root, file),
    width,
    height,
    original: { file: `images/${originalName}`, bytes: original.length },
    variants,
  };
}

async function main() {
  const site = await siteSettings();
  const settings = {
    avif: quality(args.avif, site.avif, 'avif'),
    webp: quality(args.webp, site.webp, 'webp'),
    site: { avif: site.avif, webp: site.webp },
  };
  const only = args.only?.split(',').map((slug) => slug.trim()).filter(Boolean);
  let works = await artworks();
  if (only) {
    const unknown = only.filter((slug) => !works.some((work) => work.slug === slug));
    if (unknown.length) throw new Error(`No artwork with the slug ${unknown.join(', ')}.`);
    works = works.filter((work) => only.includes(work.slug));
  }

  await mkdir(imagesDir, { recursive: true });
  const jobs = works.flatMap((work) => work.photographs.map((file) => ({ work, file })));
  const rows = new Array(jobs.length);
  let next = 0;
  // AVIF encoding is mostly single-threaded, so several photographs at once keep the cores busy, as Astro's build does.
  const workers = Array.from({ length: Math.min(availableParallelism(), 8) }, async () => {
    while (next < jobs.length) {
      const index = next++;
      rows[index] = await compare(jobs[index].work, jobs[index].file, settings, site);
      console.log(`  ${relative(root, jobs[index].file)}`);
    }
  });
  await Promise.all(workers);

  const template = await readFile(join(toolDir, 'template.html'), 'utf8');
  // Escaping "<" keeps a title from closing the inline <script> the data sits in.
  const data = JSON.stringify({ settings, rows }).replace(/</g, '\\u003c');
  await writeFile(join(outDir, 'index.html'), template.replace('__DATA__', () => data));
  console.log(`\nWrote ${rows.length} photographs to ${relative(root, outDir)}/ (AVIF q${settings.avif}, WebP q${settings.webp}).`);

  if (!args['no-serve']) serve(Number(args.port));
}

const types = { '.html': 'text/html; charset=utf-8', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

function serve(port) {
  createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = normalize(join(outDir, path.endsWith('/') ? `${path}index.html` : path));
    if (!file.startsWith(outDir + sep) || !(await exists(file))) {
      response.writeHead(404).end('Not found');
      return;
    }
    // Every image name carries a hash of its source plus its width and quality, so its content never changes and the
    // browser can keep it, as the live site does for /_astro/. The page itself is rewritten on every run.
    const cache = file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable';
    response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': cache });
    response.end(await readFile(file));
  })
    .on('error', (error) => {
      console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Pick another with --port.` : error.message);
      process.exit(1);
    })
    .listen(port, '127.0.0.1', () => {
      console.log(`Serving at http://127.0.0.1:${port}/  (Ctrl+C to stop)`);
    });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
