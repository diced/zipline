import { Card, createStyles, Group, Paper, Text } from '@mantine/core';
import { Fragment } from 'react';
import { ArrowDownLeft, ArrowDownRight, ArrowUpRight } from 'react-feather';

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
  stat: { 
    title: string; 
    icon: React.ReactNode, 
    value: string;
    desc: string;
    diff?: number;
  };
}

export default function StatCard({ stat }: StatsGridProps) {
  const { classes } = useStyles();
  if(stat.diff)
    stat.diff = Math.round(stat.diff)

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
        {
          typeof stat.diff == "number" && (
            <Fragment>
              <Text
                color={stat.diff >= 0 ? 'teal' : 'red'}
                size="sm"
                weight={500}
                className={classes.diff}
              >
                <span>{stat.diff}%</span>
                {
                  stat.diff >= 0 ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )
                }
              </Text>
            </Fragment>
          )
        }
      </Group>

      <Text size="xs" color="dimmed" mt={7}>
        {stat.desc}
      </Text>
    </Card>
  );
}