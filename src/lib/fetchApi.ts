import { ErrorBody } from './response';

const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

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

  if ((bodyMethods.includes(method) && body !== null) || (body && !Object.keys(body).length)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(route, {
    method,
    headers,
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
