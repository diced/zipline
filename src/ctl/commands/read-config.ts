export async function readConfig({ format }: { format: boolean }) {
  const { config } = await import('@/lib/config');

  console.log(JSON.stringify(config, null, format ? 2 : 0));
}
