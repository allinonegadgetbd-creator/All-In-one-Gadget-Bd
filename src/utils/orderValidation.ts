export const BD_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
] as const;

export type BdDivision = (typeof BD_DIVISIONS)[number];

export function divisionToZone(division: string): 'inside_dhaka' | 'outside_dhaka' {
  return division === 'Dhaka' ? 'inside_dhaka' : 'outside_dhaka';
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

export function convertBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

export function sanitizeCustomerNameInput(input: string): string {
  return input.replace(/[0-9০-৯]/g, '');
}

export function normalizePhoneInput(input: string): string {
  return convertBanglaDigits(input).replace(/\D/g, '').slice(0, 11);
}

export function validateOrderFields(params: {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  division?: string;
  requireDivision?: boolean;
}): {
  ok: boolean;
  error?: string;
  cleanName: string;
  cleanPhone: string;
  cleanAddress: string;
  cleanDivision?: string;
} {
  const cleanName = params.customerName.trim();
  const cleanPhone = normalizePhoneInput(params.customerPhone);
  const cleanAddress = params.customerAddress.trim();
  const cleanDivision = (params.division || '').trim() || undefined;

  if (!cleanName || cleanName.length < 2) {
    return {
      ok: false,
      error: 'Please enter your full name.',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  if (/[0-9০-৯]/.test(cleanName)) {
    return {
      ok: false,
      error: 'Numbers are not allowed in the Name field.',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  if (!/[a-zA-Z\u0980-\u09FF]{2,}/.test(cleanName.replace(/\s+/g, ''))) {
    return {
      ok: false,
      error: 'Please enter a valid customer name.',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  if (!/^01[3-9]\d{8}$/.test(cleanPhone) || /(.)\1{7}/.test(cleanPhone)) {
    return {
      ok: false,
      error: 'Mobile number must be 11 digits starting with 01 (e.g. 017XXXXXXXX).',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  if (params.requireDivision && !cleanDivision) {
    return {
      ok: false,
      error: 'Please select your Division to calculate delivery charge.',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  if (!cleanAddress || cleanAddress.length < 5) {
    return {
      ok: false,
      error: 'Please enter your full delivery address.',
      cleanName,
      cleanPhone,
      cleanAddress,
      cleanDivision,
    };
  }

  return {
    ok: true,
    cleanName,
    cleanPhone,
    cleanAddress,
    cleanDivision,
  };
}
