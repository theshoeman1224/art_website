import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const artworks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/artworks' }),
  schema: ({ image }) => {
    const sharedFields = {
      title: z.string(),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      year: z.number().int(),
      medium: z.string(),
      materials: z.array(z.string()).min(1),
      description: z.string(),
      status: z.enum([
        'artist_collection',
        'private_collection',
        'commission',
        'available',
        'not_for_sale',
      ]),
      commission: z.boolean(),
      featured: z.boolean().default(false),
      instagramUrl: z.url().optional(),
      sortOrder: z.number().int().default(99),
    };
    const secondaryImageRole = z.enum(['detail', 'angled', 'environment', 'process']);

    const legacyArtwork = z.object({
      ...sharedFields,
      placeholder: z.literal(true),
      dimensions: z.string(),
      hero: z.object({
        src: image(),
        alt: z.string().min(1),
      }),
      images: z.array(z.object({
        src: image(),
        alt: z.string().min(1),
        type: secondaryImageRole,
      })).default([]),
    });

    const portableArtwork = z.object({
      ...sharedFields,
      schemaVersion: z.literal(1),
      placeholder: z.literal(false).default(false),
      dimensions: z.object({
        height: z.number().positive(),
        width: z.number().positive(),
        depth: z.number().positive().optional(),
        unit: z.string().min(1),
      }),
      images: z.array(z.object({
        src: image(),
        alt: z.string().min(1),
        role: z.enum(['hero', 'detail', 'angled', 'environment', 'process']),
      })).min(1),
    }).superRefine((artwork, context) => {
      const heroCount = artwork.images.filter((item) => item.role === 'hero').length;
      if (heroCount !== 1) {
        context.addIssue({
          code: 'custom',
          message: 'Portable artwork packages must contain exactly one hero image.',
          path: ['images'],
        });
      }
    });

    return z.union([legacyArtwork, portableArtwork]).transform((artwork) => {
      if ('hero' in artwork) return artwork;

      const heroImage = artwork.images.find((item) => item.role === 'hero');
      if (!heroImage) throw new Error('Portable artwork package is missing its hero image.');

      const { height, width, depth, unit } = artwork.dimensions;
      const measurements = [height, width, ...(depth ? [depth] : [])].join(' × ');
      const images = artwork.images.flatMap((item) => {
        if (item.role === 'hero') return [];
        return [{ src: item.src, alt: item.alt, type: item.role }];
      });

      return {
        ...artwork,
        dimensions: `${measurements} ${unit}`,
        hero: { src: heroImage.src, alt: heroImage.alt },
        images,
      };
    });
  },
});

export const collections = { artworks };
