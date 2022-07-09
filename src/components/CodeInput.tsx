import { createStyles, MantineSize, Textarea } from '@mantine/core';

const useStyles = createStyles((theme, { size }: { size: MantineSize }) => ({
  input: {
    fontFamily: 'monospace',
    fontSize: theme.fn.size({ size, sizes: theme.fontSizes }) - 2,
    height: '100vh',
  },
}));

export default function CodeInput({ ...props }) {
  const { classes } = useStyles({ size: 'md' }, { name: 'CodeInput' });

  return (
    <Textarea
      classNames={{ input: classes.input }}
      autoComplete='nope'
      {...props}
    />
  );
}
