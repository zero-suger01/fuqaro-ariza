/** +998 phone helpers — API wants E.164 (`+998901234567`), the input shows
 * a formatted "+998 (90) 123-45-67" (docs/03-kontraktlar.md §1). */

export function digitsAfterCountryCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("998") ? digits.slice(3) : digits;
  return withoutCountryCode.slice(0, 9);
}

export function formatUzPhoneDisplay(digits: string): string {
  let out = "+998";
  if (digits.length === 0) return out;
  out += ` (${digits.slice(0, 2)}`;
  if (digits.length >= 2) out += ")";
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`;
  if (digits.length > 7) out += `-${digits.slice(7, 9)}`;
  return out;
}

export function toE164(digits: string): string {
  return `+998${digits}`;
}

export function isValidUzPhone(digits: string): boolean {
  return digits.length === 9;
}
