import { SafeConfig, safeConfig } from '@/lib/config/safe';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

export function withSafeConfig<T = {}>(
  fn: (ctx: GetServerSidePropsContext) => T | Promise<T> = (): any => {}
): GetServerSideProps<
  T & {
    config: SafeConfig;
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

    return {
      props: {
        config,
        ...data,
      },
    };
  };
}
