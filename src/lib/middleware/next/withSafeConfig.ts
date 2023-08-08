import { SafeConfig, safeConfig } from '@/lib/config/safe';
import { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

export function withSafeConfig<T = {}>(
  fn: (ctx: GetServerSidePropsContext) => T | Promise<T> = (): any => {}
): GetServerSideProps<
  T & {
    config: SafeConfig;
    themes: ZiplineTheme[];
    notFound?: boolean;
  }
> {
  return async (ctx) => {
    const config = safeConfig();

    const data = await fn(ctx);

    if ((data as any) && (data as any).notFound)
      return {
        notFound: true,
      };

    if ((data as any) && (data as any).redirect)
      return {
        redirect: (data as any).redirect,
      };

    return {
      props: {
        config,
        themes: await readThemes(),
        ...data,
      },
    };
  };
}
