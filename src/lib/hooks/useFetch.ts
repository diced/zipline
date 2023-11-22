export type ApiError = {
  error: string;
  code: number;
  [key: string]: unknown;
};

export default async function useFetch(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body: ApiError | Record<string, unknown> = null,
) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';

  const res = await global.fetch(url, {
    body: body ? JSON.stringify(body) : null,
    method,
    headers,
  });

  return res.json();
}
