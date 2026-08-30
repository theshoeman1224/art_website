import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const artworks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/artworks' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    year: z.number().int(),
    medium: z.string(),
    materials: z.array(z.string()).min(1),
    dimensions: z.string(),
    description: z.string(),
    status: z.enum([
      'artist_collection',
      'private_collection',
      'commission',
      'available',
      'not_for_sale',
    ]),
    commission: z.boolean(),
    hero: z.object({
      src: image(),
      alt: z.string().min(1),
    }),
    images: z.array(z.object({
      src: image(),
      alt: z.string().min(1),
      type: z.enum(['detail', 'angled', 'environment', 'process']),
    })).default([]),
    featured: z.boolean().default(false),
    instagramUrl: z.url().optional(),
    sortOrder: z.number().int().default(99),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { artworks };
