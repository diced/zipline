import { SafeConfig, safeConfig } from '@/lib/config/safe';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

export function withSafeConfig<T = {}>(
  fn: (ctx: GetServerSidePropsContext) => T | Promise<T> = (): any => {}
): GetServerSideProps<
  T & {
    config: SafeConfig;
  }
> {
  return async (ctx) => {
    const config = safeConfig();
    const data = await fn(ctx);

    return { props: { ...data, config } };
  };
}
