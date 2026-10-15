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
    hint: 'Any other question for the studio.',
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

// PLACEHOLDER: these ranges are not the artist's pricing. Replace them before launch (see TODO.md).
// The values are what a submission carries, so keep each one stable once real inquiries arrive.
export const budgetRanges: readonly Option[] = [
  { value: 'under-1000', label: 'Under $1,000' },
  { value: '1000-2500', label: '$1,000 – $2,500' },
  { value: '2500-5000', label: '$2,500 – $5,000' },
  { value: 'over-5000', label: '$5,000 or more' },
  { value: 'unsure', label: 'I’m not sure yet' },
];

export const timingOptions: readonly Option[] = [
  { value: 'flexible', label: 'No rush / Flexible' },
  { value: '1-2-months', label: 'Within 1–2 months' },
  { value: '3-6-months', label: 'Within 3–6 months' },
  { value: 'date', label: 'I have a specific date' },
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

// `today` is a YYYY-MM-DD string. A date one day earlier is still accepted, because the visitor's
// calendar can be a day behind the server's.
export function validateInquiry(fields: InquiryFields, today = new Date().toISOString().slice(0, 10)): InquiryErrors {
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
    if (!value('idea')) errors.idea = 'Tell us a little about the idea.';
    if (value('size') && !labelFor(sizeOptions, value('size'))) errors.size = 'Choose one of the sizes.';
    if (!labelFor(budgetRanges, value('budget'))) errors.budget = 'Choose a budget range, or “I’m not sure yet”.';
    if (!labelFor(timingOptions, value('timing'))) errors.timing = 'Choose a timeframe.';
    else if (value('timing') === 'date') {
      const date = value('date');
      const earliest = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
      if (!date) errors.date = 'Choose the date.';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = 'Enter a valid date.';
      else if (date < earliest) errors.date = 'Choose a date that has not passed.';
    }
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
      ['Budget', labelFor(budgetRanges, fields.budget) ?? '—'],
      ['Timing', labelFor(timingOptions, fields.timing) ?? '—'],
    );
    if (fields.timing === 'date') lines.push(['Specific date', value('date')]);
    lines.push(['Additional notes', value('notes')]);
  } else {
    lines.push(['Message', value('message')]);
  }

  const text = [type.heading, '', ...lines.map(([label, text]) => (text.includes('\n') ? `${label}:\n${text}` : `${label}: ${text}`))]
    .join('\n');

  return { subject: `${type.heading} from ${name || value('email')}`, text };
}
