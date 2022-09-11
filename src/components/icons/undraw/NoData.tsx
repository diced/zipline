import { Image } from '@mantine/core';
import { UndrawProps } from './types';

export default function NoData(props: UndrawProps) {
  return (
    <Image fit='contain' height={80} src='/assets/img/undraw-no-data.svg' {...props} />
  );
}