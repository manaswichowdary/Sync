export function firstNameOf(name: string): string | null {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (!/^[A-Za-z][A-Za-z'-]{0,39}$/.test(first)) return null;
  return first;
}

export function phoneOk(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function cleanEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}
