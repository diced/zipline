export async function readToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fetchToDataURL(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;

  const arr = await res.arrayBuffer();
  const base64 = Buffer.from(arr).toString('base64');

  return `data:${res.headers.get('content-type')};base64,${base64}`;
}
