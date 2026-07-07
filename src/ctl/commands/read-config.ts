import { config, reloadSettings } from '@/lib/config';

export async function readConfig({ format }: { format: boolean }) {
  await reloadSettings();

  console.log(JSON.stringify(config, null, format ? 2 : 0));
  process.exit(0);
}
