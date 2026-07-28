export async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  map: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = Array<R>(values.length);
  let next = 0;
  let failed = false;
  let failure: unknown;

  async function worker() {
    while (!failed && next < values.length) {
      const index = next++;
      try {
        results[index] = await map(values[index], index);
      } catch (error) {
        failed = true;
        failure = error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  if (failed) throw failure;

  return results;
}
