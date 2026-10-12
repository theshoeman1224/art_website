interface SectionDefinition {
  id: string;
  label: string;
}

// Display order. Each id is the value artwork records list under `sections`
// and the filter it gets on /artwork.
const definitions = [
  { id: 'bottles', label: 'Bottles' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'paintings', label: 'Paintings' },
] as const satisfies readonly SectionDefinition[];

export type SectionId = (typeof definitions)[number]['id'];
export type Section = SectionDefinition & { id: SectionId };

export const sections: readonly Section[] = definitions;
export const sectionIds = definitions.map((section) => section.id) as [SectionId, ...SectionId[]];
