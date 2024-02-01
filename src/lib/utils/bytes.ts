const units = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024,
  pb: 1024 * 1024 * 1024 * 1024 * 1024,
};

export function humanToBytes(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) return null;

  const [, num, unit] = match;

  if (unit === 'B' || unit === 'b') {
    return Number(num);
  }

  const bytes = Number(num) * units[unit.toLowerCase()];

  if (!bytes) return null;

  return bytes;
}

export function bytesToHuman(value: number | bigint): string {
  if (typeof value !== 'bigint' && isNaN(value)) return '0.0 B';
  if (value === Infinity) return '0.0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // if people upload stuff bigger than a petabyte then idk
  let num = 0;

  while (value > 1024) {
    value = Number(value) / 1024;
    ++num;
  }

  return `${Number(value).toFixed(1)} ${units[num] || ''}`;
}
