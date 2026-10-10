export function packChild(name: string, school: string): string | null {
  const cleanName = name.trim().slice(0, 40);
  const cleanSchool = school.trim().slice(0, 80);
  if (!cleanName && !cleanSchool) return null;
  return JSON.stringify({ name: cleanName, school: cleanSchool });
}

export function childLine(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: string; school?: string };
    const bits = [parsed.name?.trim(), parsed.school?.trim()].filter((bit): bit is string => Boolean(bit));
    return bits.length ? bits.join(" · ") : null;
  } catch {
    return null;
  }
}
