export function parseRange(header: string, length: number): [number, number] | null {
  const range = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(length) || length <= 0) return null;

  const first = Number(range[1]);
  const last = range[2] ? Number(range[2]) : length - 1;
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return null;

  if (!range[1]) {
    if (last === 0) return null;
    return [Math.max(0, length - last), length - 1];
  }

  if (first >= length || first > last) return null;

  return [first, Math.min(last, length - 1)];
}
