import type { Image, User } from '@prisma/client';

export function parse(str: string, image: Image, user: User) {
  if (!str) return null;

  return str
    .replace(/{user.admin}/gi, user.administrator ? 'yes' : 'no')
    .replace(/{user.id}/gi, user.id.toString())
    .replace(/{user.name}/gi, user.username)
    .replace(/{image.id}/gi, image.id.toString())
    .replace(/{image.mime}/gi, image.mimetype)
    .replace(/{image.file}/gi, image.file)
    .replace(/{image.created_at.full_string}/gi, image.created_at.toLocaleString())
    .replace(/{image.created_at.time_string}/gi, image.created_at.toLocaleTimeString())
    .replace(/{image.created_at.date_string}/gi, image.created_at.toLocaleDateString());
}

export function bytesToRead(bytes: number) {
  if (isNaN(bytes)) return '0.0 B';
  if (bytes === Infinity) return '0.0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}