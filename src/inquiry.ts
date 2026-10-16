// The /contact inquiry form: its types, choice lists, validation, and the message a submission becomes.
// Plain TypeScript with no `astro:` imports, so the page script, the Vitest suite, and a future submission
// endpoint can all import it and validate the same way.

interface Option {
  value: string;
  label: string;
}

// Display order. Each id is a `?type=` value for /contact.
const definitions = [
  {
    id: 'artwork',
    label: 'Artwork inquiry',
    hint: 'Ask about a piece you have seen.',
    heading: 'ARTWORK INQUIRY',
    submit: 'Send artwork inquiry',
  },
  {
    id: 'commission',
    label: 'Commission',
    hint: 'Start an original piece from your idea.',
    heading: 'COMMISSION INQUIRY',
    submit: 'Send commission inquiry',
  },
  {
    id: 'general',
    label: 'Something else',
    hint: 'Any other question for me.',
    heading: 'GENERAL INQUIRY',
    submit: 'Send message',
  },
] as const;

export type InquiryTypeId = (typeof definitions)[number]['id'];
export const inquiryTypes: readonly (typeof definitions)[number][] = definitions;

export const sizeOptions: readonly Option[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'unsure', label: 'Not sure yet' },
];

// The artwork field's value when the piece is not on the site.
export const pieceNotListed = 'not-listed';

// Hidden from people, so anything in it came from a bot.
export const honeypotField = 'website';

export type InquiryFields = Record<string, string | undefined>;
export type InquiryErrors = Record<string, string>;

const maxLength: Record<string, number> = { firstName: 100, lastName: 100, email: 254, piece: 200 };
const maxTextLength = 5000;

export function parseInquiryType(value: string | null | undefined): InquiryTypeId | null {
  return inquiryTypes.find((type) => type.id === value)?.id ?? null;
}

function labelFor(options: readonly Option[], value: string | undefined) {
  return options.find((option) => option.value === value)?.label;
}

export function validateInquiry(fields: InquiryFields): InquiryErrors {
  const errors: InquiryErrors = {};
  const value = (name: string) => fields[name]?.trim() ?? '';
  const type = parseInquiryType(fields.type);

  if (!type) return { type: 'Choose what your message is about.' };

  if (!value('firstName')) errors.firstName = 'Enter your first name.';
  if (!value('email')) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) {
    errors.email = 'Enter an email address like name@example.com.';
  }

  if (type === 'artwork' && !value('piece')) errors.piece = 'Choose a piece, or choose “Not listed here”.';
  if ((type === 'artwork' || type === 'general') && !value('message')) errors.message = 'Write your message.';

  if (type === 'commission') {
    if (!value('idea')) errors.idea = 'Tell me a little about the idea.';
    if (value('size') && !labelFor(sizeOptions, value('size'))) errors.size = 'Choose one of the sizes.';
  }

  for (const [name, text] of Object.entries(fields)) {
    if (errors[name] || !text) continue;
    const limit = maxLength[name] ?? maxTextLength;
    if (text.length > limit) errors[name] = `Keep this under ${limit.toLocaleString('en-US')} characters.`;
  }

  return errors;
}

export function isLikelySpam(fields: InquiryFields) {
  return Boolean(fields[honeypotField]?.trim());
}

// The message the studio receives: the inquiry type first, then one labelled line per field so it can
// be scanned quickly. `pieceTitle` turns the artwork field's slug into the title when the caller knows it.
export function formatInquiry(fields: InquiryFields, pieceTitle?: string) {
  const type = inquiryTypes.find((item) => item.id === fields.type) ?? inquiryTypes[inquiryTypes.length - 1];
  const value = (name: string) => fields[name]?.trim() || '—';
  const name = [fields.firstName?.trim(), fields.lastName?.trim()].filter(Boolean).join(' ');
  const lines: [string, string][] = [
    ['Name', name || '—'],
    ['Email', value('email')],
  ];

  if (type.id === 'artwork') {
    const piece = fields.piece === pieceNotListed ? 'Not listed on the site' : pieceTitle || value('piece');
    lines.push(['Artwork', piece], ['Message', value('message')]);
  } else if (type.id === 'commission') {
    lines.push(
      ['Idea', value('idea')],
      ['Requested elements', value('elements')],
      ['Approximate size', labelFor(sizeOptions, fields.size) ?? '—'],
      ['Additional notes', value('notes')],
    );
  } else {
    lines.push(['Message', value('message')]);
  }

  const text = [type.heading, '', ...lines.map(([label, text]) => (text.includes('\n') ? `${label}:\n${text}` : `${label}: ${text}`))]
    .join('\n');

  return { subject: `${type.heading} from ${name || value('email')}`, text };
}
