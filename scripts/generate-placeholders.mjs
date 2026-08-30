import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('src/assets/artworks');

const studies = [
  { slug: 'fault-line', width: 1800, height: 2300, colors: ['#c9875e', '#20292c', '#d8c9af'], form: 'glass' },
  { slug: 'held-light', width: 2200, height: 1500, colors: ['#92a7a2', '#dbb66e', '#312d29'], form: 'bottle' },
  { slug: 'after-vessel', width: 1600, height: 2100, colors: ['#9a5d45', '#d5c5a7', '#273331'], form: 'ceramic' },
  { slug: 'weathered-signal', width: 1700, height: 1700, colors: ['#b84e39', '#d7c5a2', '#243235'], form: 'abstract' },
];

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function composition({ width, height, colors, form }, role) {
  const [accent, pale, dark] = colors;
  const detail = role === 'detail';
  const angled = role === 'angle';
  const environment = role === 'environment';
  const process = role === 'process';
  const label = escapeXml(`${form.toUpperCase()} / SAMPLE ${role.toUpperCase()}`);
  const transform = angled ? `translate(${width * 0.08} ${height * 0.02}) skewX(-7)` : '';
  const scale = detail ? 1.55 : environment ? 0.68 : 1;
  const backdrop = environment ? '#252522' : '#111210';
  const workX = environment ? width * 0.18 : 0;
  const workY = environment ? height * 0.1 : 0;
  const workW = environment ? width * 0.64 : width;
  const workH = environment ? height * 0.78 : height;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.08" numOctaves="4" seed="${form.length * 17}" result="noise"/>
          <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
          <feBlend in="SourceGraphic" in2="gray" mode="soft-light"/>
        </filter>
        <filter id="rough"><feTurbulence baseFrequency="0.025" numOctaves="3" seed="9" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="${detail ? 65 : 28}"/></filter>
        <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".5" stop-color="${pale}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
        <radialGradient id="light"><stop stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="${backdrop}"/>
      ${environment ? `<rect x="${width * 0.06}" y="${height * 0.9}" width="${width * 0.88}" height="${height * 0.02}" fill="#0a0a09"/><rect x="${workX - 12}" y="${workY - 12}" width="${workW + 24}" height="${workH + 24}" fill="#0a0a09"/>` : ''}
      <svg x="${workX}" y="${workY}" width="${workW}" height="${workH}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
        <g filter="url(#grain)" transform="${transform} scale(${scale}) translate(${detail ? -width * 0.18 : 0} ${detail ? -height * 0.18 : 0})">
          <rect width="${width}" height="${height}" fill="url(#ground)"/>
          <path d="M${-width * .05},${height * .73} C${width * .2},${height * .48} ${width * .38},${height * .91} ${width * .61},${height * .55} S${width * .9},${height * .22} ${width * 1.08},${height * .4} L${width * 1.08},${height * 1.08} L0,${height * 1.08}Z" fill="${dark}" opacity=".84" filter="url(#rough)"/>
          <path d="M${width * .08},${height * .15} L${width * .52},${height * .03} ${width * .86},${height * .29} ${width * .65},${height * .62} ${width * .26},${height * .52}Z" fill="${pale}" opacity=".72"/>
          <path d="M${width * .19},${height * .12} L${width * .42},${height * .62} ${width * .7},${height * .18} ${width * .9},${height * .8}" fill="none" stroke="#e8e4da" stroke-width="${Math.max(width, height) * .009}" opacity=".62"/>
          <path d="M${width * .1},${height * .76} Q${width * .45},${height * .45} ${width * .88},${height * .74}" fill="none" stroke="${accent}" stroke-width="${Math.max(width, height) * .065}" opacity=".88" filter="url(#rough)"/>
          <circle cx="${width * .68}" cy="${height * .33}" r="${Math.min(width, height) * .21}" fill="url(#light)"/>
          <g fill="none" stroke="#f0e9da" stroke-width="${Math.max(width, height) * .004}" opacity=".45">
            <path d="M${width * .17},${height * .03} l${width * .1},${height * .38} l${width * -.08},${height * .27}"/>
            <path d="M${width * .58},0 l${width * -.16},${height * .39} l${width * .31},${height * .4}"/>
            <path d="M${width * .96},${height * .08} l${width * -.21},${height * .46} l${width * .18},${height * .33}"/>
          </g>
          ${process ? `<g fill="#ece4d5" opacity=".72"><rect x="${width * .08}" y="${height * .1}" width="${width * .12}" height="${height * .18}" transform="rotate(-8)"/><rect x="${width * .72}" y="${height * .67}" width="${width * .15}" height="${height * .2}" transform="rotate(11)"/></g>` : ''}
        </g>
      </svg>
      <text x="${width * .045}" y="${height * .955}" fill="#eee9df" opacity=".7" font-family="Arial, sans-serif" font-size="${Math.max(width, height) * .014}" letter-spacing="${Math.max(width, height) * .003}">${label}</text>
    </svg>`;
}

await mkdir(root, { recursive: true });

for (const study of studies) {
  const directory = path.join(root, study.slug);
  await mkdir(directory, { recursive: true });

  const roles = study.slug === 'fault-line'
    ? ['hero', 'detail', 'angle', 'environment', 'process']
    : ['hero', 'detail', 'angle'];

  for (const role of roles) {
    await sharp(Buffer.from(composition(study, role)))
      .jpeg({ quality: 91, chromaSubsampling: '4:4:4' })
      .toFile(path.join(directory, `${role}.jpg`));
  }
}

const portrait = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1800">
    <defs><filter id="g"><feTurbulence baseFrequency=".018" numOctaves="4"/><feBlend mode="soft-light" in="SourceGraphic"/></filter></defs>
    <rect width="100%" height="100%" fill="#292824"/>
    <g filter="url(#g)"><circle cx="700" cy="625" r="255" fill="#a7947a"/><path d="M220 1800 Q270 950 700 940 T1180 1800" fill="#151514"/><rect x="110" y="120" width="1180" height="1520" fill="none" stroke="#eee9df" opacity=".2" stroke-width="3"/></g>
    <text x="70" y="1725" fill="#eee9df" opacity=".7" font-family="Arial" font-size="26" letter-spacing="7">ARTIST PORTRAIT PLACEHOLDER</text>
  </svg>`;

await mkdir(path.resolve('src/assets'), { recursive: true });
await sharp(Buffer.from(portrait)).jpeg({ quality: 90 }).toFile(path.resolve('src/assets/artist-placeholder.jpg'));

console.log(`Generated sample artwork photography in ${root}`);
