export function createURL(href: string, route: string, file: string): string {
  const t = new URL(href);
  t.pathname = `${route}/${file}`;
  return t.toString();
}