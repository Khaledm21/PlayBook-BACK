/**
 * Flexible Egyptian Phone Number Utilities
 * Supports formats like:
 * - 01012345678
 * - +20 10 1234 5678
 * - +201012345678
 * - 00201012345678
 * - 010-1234-5678
 * - (010) 12345678
 * - 1012345678
 */

export const cleanPhoneDigits = (val: string): string => {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/[\s\-\(\)\.]/g, '').trim();
};

export const isFlexibleEgyptianPhone = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const cleaned = cleanPhoneDigits(val);
  // Match optional prefix (+20, 0020, 20, 0), then mobile prefix (1[0125]), followed by 8 digits
  return /^(?:\+?20|0020|0)?1[0125][0-9]{8}$/.test(cleaned);
};

export const normalizePhoneNumber = (val: string): string => {
  if (!val || typeof val !== 'string') return val;
  const cleaned = cleanPhoneDigits(val);

  // If it matches international Egyptian prefix (+20, 0020, 20) followed by 1[0125]xxxxxxxx
  if (/^(?:\+?20|0020|20)1[0125][0-9]{8}$/.test(cleaned)) {
    return '0' + cleaned.replace(/^(?:\+?20|0020|20)/, '');
  }

  // If it's a 10-digit number starting with 1[0125]xxxxxxxx, prepend '0'
  if (/^1[0125][0-9]{8}$/.test(cleaned)) {
    return '0' + cleaned;
  }

  // If it's already 01[0125]xxxxxxxx (11 digits)
  if (/^01[0125][0-9]{8}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned || val.trim();
};

export const getPhoneSearchVariants = (val: string): string[] => {
  if (!val || typeof val !== 'string') return [];
  const raw = val.trim();
  const cleaned = cleanPhoneDigits(val);
  const normalized = normalizePhoneNumber(val);

  const variants = new Set<string>();
  if (raw) variants.add(raw);
  if (cleaned) variants.add(cleaned);
  if (normalized) {
    variants.add(normalized);
    // Add international format +20xxxxxxxxxx
    if (normalized.startsWith('01') && normalized.length === 11) {
      variants.add('+20' + normalized.slice(1));
      variants.add('20' + normalized.slice(1));
      variants.add('0020' + normalized.slice(1));
    }
  }

  return Array.from(variants);
};
