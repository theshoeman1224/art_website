import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { sectionIds } from './sections';

const artworks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/artworks' }),
  schema: ({ image }) => {
    const sharedFields = {
      title: z.string(),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      year: z.number().int(),
      // Optional: a blank description counts as none, and the artwork page fills its space with the next photograph.
      description: z.string().trim().optional(),
      status: z.enum(['available', 'unavailable', 'sold']).optional(),
      sections: z.array(z.enum(sectionIds)).min(1),
      featured: z.boolean().default(false),
      // Marks a record whose details are still TODO, so the homepage showcase can leave it out.
      placeholder: z.boolean().default(false),
      instagramUrl: z.url().optional(),
      // Serves every photograph of the work exactly as supplied, with no resizing or re-encoding, for a work whose deep
      // blacks or fine tonal detail compression visibly damages. Costs about 1 MB per photograph wherever it appears.
      fullResolution: z.boolean().default(false),
      sortOrder: z.number().int().default(99),
    };
    const secondaryImageRole = z.enum(['detail', 'angled', 'environment', 'process']);

    return z.object({
      ...sharedFields,
      schemaVersion: z.literal(1),
      dimensions: z.object({
        height: z.number().positive(),
        width: z.number().positive(),
        depth: z.number().positive().optional(),
        unit: z.string().min(1),
        // For a work made of several same-sized parts: the measurements are per part.
        each: z.boolean().optional(),
      }),
      images: z.array(z.object({
        src: image(),
        alt: z.string().min(1),
        role: z.enum(['hero', ...secondaryImageRole.options]),
      })).min(1),
    }).superRefine((artwork, context) => {
      const heroCount = artwork.images.filter((item) => item.role === 'hero').length;
      if (heroCount !== 1) {
        context.addIssue({
          code: 'custom',
          message: 'Artwork packages must contain exactly one hero image.',
          path: ['images'],
        });
      }
      if (new Set(artwork.sections).size !== artwork.sections.length) {
        context.addIssue({
          code: 'custom',
          message: 'Artwork sections must not repeat.',
          path: ['sections'],
        });
      }
    }).transform((artwork) => {
      const heroImage = artwork.images.find((item) => item.role === 'hero');
      if (!heroImage) throw new Error('Artwork package is missing its hero image.');

      const { height, width, depth, unit, each } = artwork.dimensions;
      // The artist lists the smaller of height and width first, whichever way the work hangs.
      const face = [height, width].sort((a, b) => a - b);
      const measurements = [...face, ...(depth ? [depth] : [])].join(' × ');
      const images = artwork.images.flatMap((item) => {
        if (item.role === 'hero') return [];
        return [{ src: item.src, alt: item.alt, type: item.role }];
      });

      return {
        ...artwork,
        description: artwork.description || undefined,
        dimensions: `${measurements} ${unit}${each ? ' each' : ''}`,
        hero: { src: heroImage.src, alt: heroImage.alt },
        images,
      };
    });
  },
});

export const collections = { artworks };
