import { onUpload as discordOnUpload, onShorten as discordOnShorten } from './discord';
import { onUpload as httpOnUpload, onShorten as httpOnShorten } from './http';

export async function onUpload(args: Parameters<typeof discordOnUpload>[0]) {
  Promise.all([discordOnUpload(args), httpOnUpload(args)]);

  return;
}

export async function onShorten(args: Parameters<typeof discordOnShorten>[0]) {
  Promise.all([discordOnShorten(args), httpOnShorten(args)]);

  return;
}
