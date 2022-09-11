import { SimpleGrid, Skeleton, Title } from '@mantine/core';
import Card from 'components/Card';
import MutedText from 'components/MutedText';
import { SmallTable } from 'components/SmallTable';
import { bytesToRead } from 'lib/clientUtils';
import { useStats } from 'lib/queries/stats';
import { StatCards } from '../Dashboard/StatCards';
import Graphs from './Graphs';
import Types from './Types';

export default function Stats() {
  const stats = useStats();

  return (
    <div className="gap-5 flex flex-col">
      <Title>Stats</Title>

      <StatCards />
      <Types />

      <Graphs />

    </div>
  );
}
