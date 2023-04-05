import { Box, CloseButton, MultiSelectValueProps, rem } from '@mantine/core';

export default function Tag({
  label,
  onRemove,
  color,
  ...others
}: MultiSelectValueProps & { color: string }) {
  return (
    <div {...others}>
      <Box
        sx={(theme) => ({
          display: 'flex',
          cursor: 'default',
          alignItems: 'center',
          backgroundColor: color,
          paddingLeft: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        })}
      >
        <Box sx={{ lineHeight: 1, fontSize: rem(12) }}>{label}</Box>
        <CloseButton onMouseDown={onRemove} variant='transparent' size={22} iconSize={14} tabIndex={-1} />
      </Box>
    </div>
  );
}
