export function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(';') || value.includes('\n')) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

