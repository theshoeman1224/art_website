interface SectionDefinition {
  id: string;
  label: string;
  description: string;
  cta?: { href: string; label: string };
}

// Display order. Each id is also the URL segment of its page, /work/<id>,
// and needs a matching stub in src/pages/work/.
const definitions = [
  {
    id: 'bottles',
    label: 'Bottles',
    description: 'Bottles broken apart and reassembled around what remains recognizable of the original form.',
  },
  {
    id: 'commissions',
    label: 'Commissions',
    description: "Works that began with a client's object, memory, or idea and were carried through the artist's own process.",
    cta: { href: '/commissions', label: 'How commissions work' },
  },
  {
    id: 'paintings',
    label: 'Paintings',
    description: 'Textured, layered surfaces built up on canvas.',
  },
] as const satisfies readonly SectionDefinition[];

export type SectionId = (typeof definitions)[number]['id'];
export type Section = SectionDefinition & { id: SectionId };

export const sections: readonly Section[] = definitions;
export const sectionIds = definitions.map((section) => section.id) as [SectionId, ...SectionId[]];

export function sectionPath(id: SectionId) {
  return `/work/${id}`;
}
