// The studio emblem is a 512 px PNG of about 240 KB. The header and footer show it at 52 and 64 px, so they render it
// at their display size for 1×, 2×, and 3× screens instead. Quality 80 keeps the gold edges crisp against the black
// at a few kilobytes per file; the PNG fallback is for browsers with neither AVIF nor WebP.
export const emblemImage: { densities: number[]; formats: ('avif' | 'webp')[]; fallbackFormat: 'png'; quality: number } = {
  densities: [1, 2, 3],
  formats: ['avif', 'webp'],
  fallbackFormat: 'png',
  quality: 80,
};
