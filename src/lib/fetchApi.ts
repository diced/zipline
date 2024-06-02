import { ErrorBody } from './response';

export async function fetchApi<Response = any>(
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body: any = null,
  headers: Record<string, string> = {},
): Promise<{
  data: Response | null;
  error: ErrorBody | null;
}> {
  let data: Response | null = null;
  let error: ErrorBody | null = null;

  const res = await fetch(route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (res.ok) {
    data = await res.json();
  } else {
    if (res.headers.get('Content-Type')?.startsWith('application/json')) {
      error = await res.json();
    } else {
      error = {
        message: await res.text(),
        statusCode: res.status,
      } as ErrorBody;
    }
  }

  return { data, error };
}
