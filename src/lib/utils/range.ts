export function parseRangeHeader(header?: string): [number, number] {
  if (!header || !header.startsWith('bytes=')) return [0, Infinity];

  const range = header.replace('bytes=', '').split('-');
  const start = Number(range[0]) || 0;
  const end = Number(range[1]) || Infinity;

  return [start, end];
}
