import { Image } from '@mantine/core';
// import Image from 'next/image';
// import { SVGProps } from 'react';
// import NoDataSVG from './assets/undraw-no-data.svg';

type UndrawProps = Omit<Parameters<typeof Image>[0], 'src'>;

export default function NoData(props: UndrawProps) {
  return (
    <Image fit='contain' height={80} src='/assets/img/undraw-no-data.svg' {...props} />
  );
}