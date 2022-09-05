import { Card, createStyles, Group, Paper, Text } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  root: {
    padding: theme.spacing.xl * 1.5,
  },

  value: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },

  diff: {
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  },

  icon: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[4],
  },

  title: {
    fontWeight: 700,
    textTransform: 'uppercase',
  },
}));

interface StatsGridProps {
  stat: { title: string; icon: React.ReactNode, value: string; desc: string };
}

export default function StatCard({ stat }: StatsGridProps) {
  const { classes } = useStyles();

  return (
    <Card p="md" radius="md" key={stat.title}>
      <Group position="apart">
        <Text size="xs" color="dimmed" className={classes.title}>
          {stat.title}
        </Text>
        {stat.icon}
      </Group>

      <Group align="flex-end" spacing="xs" mt={25}>
        <Text className={classes.value}>{stat.value}</Text>
      </Group>

      <Text size="xs" color="dimmed" mt={7}>
        {stat.desc}
      </Text>
    </Card>
  );
}