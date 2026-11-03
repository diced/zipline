export async function fetchExternal(
  input: unknown,
  {
    origin,
    maxBytes = 10 * 1024 * 1024,
  }: {
    origin: string;
    maxBytes?: number;
  },
): Promise<{ body: Buffer; contentType: string | null } | null> {
  if (typeof input !== 'string' || !input) return null;

  let response: Response | undefined;
  try {
    const url = new URL(input);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== new URL(origin).origin ||
      url.username ||
      url.password
    )
      return null;

    response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
    if (!response.ok || !response.body) return null;
    if (Number(response.headers.get('content-length')) > maxBytes) return null;

    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > maxBytes) return null;
      chunks.push(chunk);
    }

    return { body: Buffer.concat(chunks), contentType: response.headers.get('content-type') };
  } catch {
    return null;
  } finally {
    await response?.body?.cancel().catch(() => {});
  }
}
