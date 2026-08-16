import { ApiErrorPayload } from './api/errors';

const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

export async function fetchApi<Response = any>(
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body: any = null,
  headers: Record<string, string> = {},
): Promise<{
  data: Response | null;
  error: ApiErrorPayload | null;
}> {
  let data: Response | null = null;
  let error: ApiErrorPayload | null = null;

  if ((bodyMethods.includes(method) && body !== null) || (body && !Object.keys(body).length)) {
    headers['Content-Type'] = 'application/json';
  }

  const requestInit: RequestInit = { method, headers };

  if (body) {
    if (!bodyMethods.includes(method)) {
      throw new TypeError(`Request with ${method} method cannot have a body.`);
    }

    requestInit.body = JSON.stringify(body);
  }

  const res = await fetch(route, requestInit);

  if (res.ok) {
    data = await res.json();
  } else {
    if (res.headers.get('Content-Type')?.startsWith('application/json')) {
      error = await res.json();
    } else {
      error = {
        code: 9000,
        error: await res.text(),
        statusCode: res.status,
      } as ApiErrorPayload;
    }
  }

  return { data, error };
}
