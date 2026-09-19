export function parseRange(header: string, length: number): [number, number] {
  const range = header.trim().substring(6);

  let start, end;

  if (range.startsWith('-')) {
    end = length - 1;
    start = Math.max(0, length - Number(range.substring(1)));
  } else {
    const [s, e] = range.split('-');
    start = Number(s);
    const parsedEnd = Number(e);
    end = e?.trim() && !Number.isNaN(parsedEnd) ? parsedEnd : length - 1;
  }

  if (end > length - 1) {
    end = length - 1;
  }

  return [start, end];
}
