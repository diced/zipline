export function parseRange(header: string, length: number): [number, number] {
  const range = header.trim().substring(6);

  let start, end;

  if (range.startsWith('-')) {
    end = length - 1;
    start = length - 1 - Number(range.substring(1));
  } else {
    const [s, e] = range.split('-').map(Number);
    start = s;
    end = e || length - 1;
  }

  if (end > length - 1) {
    end = length - 1;
  }

  return [start, end];
}
