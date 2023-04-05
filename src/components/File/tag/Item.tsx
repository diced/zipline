import { ComponentPropsWithoutRef, forwardRef } from 'react';
import { Group, Text } from '@mantine/core';

interface ItemProps extends ComponentPropsWithoutRef<'div'> {
  color: string;
  label: string;
}

const Item = forwardRef<HTMLDivElement, ItemProps>(({ color, label, ...others }: ItemProps, ref) => (
  <div ref={ref} {...others}>
    <Group noWrap>
      <Text color={color}>{label}</Text>
    </Group>
  </div>
));

export default Item;
