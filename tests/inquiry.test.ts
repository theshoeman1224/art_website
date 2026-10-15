import { describe, expect, it } from 'vitest';
import { formatInquiry, honeypotField, isLikelySpam, parseInquiryType, pieceNotListed, validateInquiry } from '../src/inquiry';

const today = '2026-10-14';
const person = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };
const commission = { ...person, type: 'commission', idea: 'My grandfather’s fishing lure.', budget: 'unsure', timing: 'flexible' };

describe('parseInquiryType', () => {
  it('accepts the three types and nothing else', () => {
    expect(['artwork', 'commission', 'general'].map(parseInquiryType)).toEqual(['artwork', 'commission', 'general']);
    expect([null, undefined, '', 'Commission', 'bogus'].map(parseInquiryType)).toEqual([null, null, null, null, null]);
  });
});

describe('validateInquiry', () => {
  it('asks for a type before anything else', () => {
    expect(validateInquiry({ ...person, type: 'bogus' }, today)).toEqual({ type: expect.any(String) });
  });

  it('requires a first name and a valid email for every type, but not a last name', () => {
    for (const type of ['artwork', 'commission', 'general']) {
      const errors = validateInquiry({ type, email: 'not-an-email' }, today);
      expect(errors).toHaveProperty('firstName');
      expect(errors).toHaveProperty('email');
      expect(errors).not.toHaveProperty('lastName');
    }
  });

  it('requires a piece and a message for an artwork inquiry', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'artwork' }, today)).sort()).toEqual(['message', 'piece']);
    expect(validateInquiry({ ...person, type: 'artwork', piece: pieceNotListed, message: 'Hi' }, today)).toEqual({});
  });

  it('requires only a message for a general inquiry', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'general' }, today))).toEqual(['message']);
  });

  it('requires an idea, budget, and timing for a commission, but not a size', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'commission' }, today)).sort()).toEqual(['budget', 'idea', 'timing']);
    expect(validateInquiry(commission, today)).toEqual({});
  });

  it('rejects choices that are not on the form', () => {
    const errors = validateInquiry({ ...commission, size: 'huge', budget: 'a lot', timing: 'soon' }, today);
    expect(Object.keys(errors).sort()).toEqual(['budget', 'size', 'timing']);
  });

  it('requires a date that has not passed when the timing is a specific date', () => {
    const dated = { ...commission, timing: 'date' };
    expect(validateInquiry(dated, today)).toHaveProperty('date');
    expect(validateInquiry({ ...dated, date: '2026-02-30x' }, today)).toHaveProperty('date');
    expect(validateInquiry({ ...dated, date: '2026-10-01' }, today)).toHaveProperty('date');
    // One day of grace for a visitor whose calendar is behind the server's.
    expect(validateInquiry({ ...dated, date: '2026-10-13' }, today)).toEqual({});
    expect(validateInquiry({ ...dated, date: '2027-03-01' }, today)).toEqual({});
  });

  it('limits field lengths', () => {
    expect(validateInquiry({ ...commission, notes: 'x'.repeat(5001) }, today)).toHaveProperty('notes');
    expect(validateInquiry({ ...commission, firstName: 'x'.repeat(101) }, today)).toHaveProperty('firstName');
  });
});

describe('isLikelySpam', () => {
  it('flags a filled honeypot', () => {
    expect(isLikelySpam(commission)).toBe(false);
    expect(isLikelySpam({ ...commission, [honeypotField]: 'https://spam.example' })).toBe(true);
  });
});

describe('formatInquiry', () => {
  it('opens with the inquiry type and lists every commission field by label', () => {
    const { subject, text } = formatInquiry({ ...commission, size: 'large', timing: 'date', date: '2027-03-01' });

    expect(subject).toBe('COMMISSION INQUIRY from Ada Lovelace');
    expect(text.split('\n')).toEqual([
      'COMMISSION INQUIRY',
      '',
      'Name: Ada Lovelace',
      'Email: ada@example.com',
      'Idea: My grandfather’s fishing lure.',
      'Requested elements: —',
      'Approximate size: Large',
      'Budget: I’m not sure yet',
      'Timing: I have a specific date',
      'Specific date: 2027-03-01',
      'Additional notes: —',
    ]);
  });

  it('names the artwork for an artwork inquiry', () => {
    const fields = { ...person, type: 'artwork', piece: 'riptide', message: 'Is it available?' };

    expect(formatInquiry(fields, 'Riptide').text).toContain('Artwork: Riptide');
    expect(formatInquiry(fields).text).toContain('Artwork: riptide');
    expect(formatInquiry({ ...fields, piece: pieceNotListed }).text).toContain('Artwork: Not listed on the site');
    expect(formatInquiry({ ...person, type: 'general', message: 'Hello' }).text.split('\n')[0]).toBe('GENERAL INQUIRY');
  });
});
