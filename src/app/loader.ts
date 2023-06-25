import type { LoaderArgs } from '@remix-run/node';
import type { Config } from 'lib/config/Config';

export type TypedLoaderArgs<T> = {
  context: T;
} & Omit<LoaderArgs, 'context'>;

export type RouteContext = {
  config: Config;
};
