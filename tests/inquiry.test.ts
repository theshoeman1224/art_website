import { describe, expect, it } from 'vitest';
import { formatInquiry, honeypotField, isLikelySpam, parseInquiryType, pieceNotListed, validateInquiry } from '../src/inquiry';

const person = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };
const commission = { ...person, type: 'commission', idea: 'My grandfather’s fishing lure.' };

describe('parseInquiryType', () => {
  it('accepts the three types and nothing else', () => {
    expect(['artwork', 'commission', 'general'].map(parseInquiryType)).toEqual(['artwork', 'commission', 'general']);
    expect([null, undefined, '', 'Commission', 'bogus'].map(parseInquiryType)).toEqual([null, null, null, null, null]);
  });
});

describe('validateInquiry', () => {
  it('asks for a type before anything else', () => {
    expect(validateInquiry({ ...person, type: 'bogus' })).toEqual({ type: expect.any(String) });
  });

  it('requires a first name and a valid email for every type, but not a last name', () => {
    for (const type of ['artwork', 'commission', 'general']) {
      const errors = validateInquiry({ type, email: 'not-an-email' });
      expect(errors).toHaveProperty('firstName');
      expect(errors).toHaveProperty('email');
      expect(errors).not.toHaveProperty('lastName');
    }
  });

  it('requires a piece and a message for an artwork inquiry', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'artwork' })).sort()).toEqual(['message', 'piece']);
    expect(validateInquiry({ ...person, type: 'artwork', piece: pieceNotListed, message: 'Hi' })).toEqual({});
  });

  it('requires only a message for a general inquiry', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'general' }))).toEqual(['message']);
  });

  it('requires an idea for a commission, but not a size', () => {
    expect(Object.keys(validateInquiry({ ...person, type: 'commission' }))).toEqual(['idea']);
    expect(validateInquiry(commission)).toEqual({});
  });

  it('rejects a size that is not on the form', () => {
    expect(Object.keys(validateInquiry({ ...commission, size: 'huge' }))).toEqual(['size']);
  });

  it('limits field lengths', () => {
    expect(validateInquiry({ ...commission, notes: 'x'.repeat(5001) })).toHaveProperty('notes');
    expect(validateInquiry({ ...commission, firstName: 'x'.repeat(101) })).toHaveProperty('firstName');
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
    const { subject, text } = formatInquiry({ ...commission, size: 'large' });

    expect(subject).toBe('COMMISSION INQUIRY from Ada Lovelace');
    expect(text.split('\n')).toEqual([
      'COMMISSION INQUIRY',
      '',
      'Name: Ada Lovelace',
      'Email: ada@example.com',
      'Idea: My grandfather’s fishing lure.',
      'Requested elements: —',
      'Approximate size: Large',
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
