import { Image } from '@mantine/core';
import { UndrawProps } from "./types";

export default function WaitingForYou(props: UndrawProps) {
  return (
    <Image fit='contain' height={240} src='/assets/img/undraw-waiting-for-you.svg' {...props} />
  );
}