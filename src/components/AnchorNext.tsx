import { Anchor } from '@mantine/core';
import Link from 'next/link';

export default function AnchorNext({ href, ...others }) {
  return <Anchor component={Link} href={href} {...others} />;
}
