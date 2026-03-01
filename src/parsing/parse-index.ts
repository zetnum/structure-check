export function parseIndex(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  const digits = match?.[1];
  if (digits === undefined) {
    return null;
  }
  return parseInt(digits, 10);
}
