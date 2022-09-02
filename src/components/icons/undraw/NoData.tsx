import Image from 'next/image';
import { lazy } from 'react';
const undraw = lazy(() => import('./assets/undraw-no-data.svg'));

type UnsplashProps = Omit<Parameters<typeof Image>[0], 'src'>;

export default function NoData(props: UnsplashProps) {
  return (
    <Image layout='fill' {...props} src='/assets/undraw-no-data.svg' />
  );
}