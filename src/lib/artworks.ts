import { getCollection, type CollectionEntry } from 'astro:content';
import type { SectionId } from '../sections';

export type Artwork = CollectionEntry<'artworks'>;

export const statusLabels: Record<Artwork['data']['status'], string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  sold: 'Sold',
};

export async function getSortedArtworks() {
  return (await getCollection('artworks')).sort((a, b) =>
    a.data.sortOrder - b.data.sortOrder || a.data.title.localeCompare(b.data.title)
  );
}

export function inSection(artworks: Artwork[], section: SectionId) {
  return artworks.filter((artwork) => artwork.data.sections.includes(section));
}
