export function getFilePath(file: { userId: string | null; type: string; name: string }) {
  const category = file.type.split('/')[0] || 'other';
  // Use 'Anonymous' for null userId
  const userDir = file.userId ? file.userId : 'Anonymous';
  return `${userDir}/${category}/${file.name}`;
}
