import { json } from '@remix-run/node';
import { isRouteErrorResponse, useRouteError } from '@remix-run/react';
import { RouteContext, TypedLoaderArgs } from '~/loader';

export const loader = async ({ params, context }: TypedLoaderArgs<RouteContext>) => {
  const slug = params['*']?.split('/').filter(Boolean) ?? [];
  if (!slug.length) {
    throw json('Not Found (no slug)', { status: 404 });
  }

  console.log(slug, context.config);

  if (slug[0] === context.config.files.route) {
  } else {
    throw json('Not Found (catchall)', { status: 404 });
  }

  return json({ slug });
};

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>;
  } else if (error instanceof Error) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>;
  } else {
    return <p>Unknown error</p>;
  }
}

// export default function Index() {
//   return <p>Index</p>;
// }
