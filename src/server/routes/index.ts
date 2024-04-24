import fastifyPlugin from 'fastify-plugin';
import glob from 'fast-glob';
import { pathToFileURL } from 'url';

const DEV = process.env.NODE_ENV === 'development';

const loadRoutes = async (): Promise<Record<string, ReturnType<typeof fastifyPlugin>>> => {
  const files = await glob(`./${DEV ? 'src' : 'build'}/server/routes/**/!(*.dy).@(ts|js)`, {
    ignore: [`./${DEV ? 'src' : 'build'}/server/routes/index.(ts|js)`],
  });

  const routes: Record<string, ReturnType<typeof fastifyPlugin>> = {};

  for (const file of files) {
    const a = await import(pathToFileURL(file).href);
    if (!a.default) throw new Error(`Route ${file} does not have a default export.`);
    if (!a.PATH) throw new Error(`Route ${file} does not have a PATH export.`);

    routes[a.PATH] = a.default;
  }

  return routes;
};

export default loadRoutes;
