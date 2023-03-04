import { Anchor } from '@mantine/core';
import * as NextLink from 'next/link';

export default function Link(props) {
  return <Anchor component={NextLink} legacyBehavior {...props} />;
}
