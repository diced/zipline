import { config as libConfig, reloadSettings } from '@/lib/config';
import { SafeConfig, safeConfig } from '@/lib/config/safe';
import { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

export function withSafeConfig<T = unknown>(
  fn: (ctx: GetServerSidePropsContext, config: SafeConfig) => T | Promise<T> = (): any => {},
): GetServerSideProps<
  T & {
    config: SafeConfig;
    themes: ZiplineTheme[];
    notFound?: boolean;
  }
> {
  return async (ctx) => {
    if (!libConfig) await reloadSettings();

    const config = safeConfig(libConfig);
    const data = await fn(ctx, config);

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
