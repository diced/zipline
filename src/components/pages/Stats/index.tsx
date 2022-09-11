import { Title } from '@mantine/core';
import { StatCards } from '../Dashboard/StatCards';
import Graphs from './Graphs';
import Types from './Types';

export default function Stats() {
  return (
    <div className='gap-5 flex flex-col'>
      <Title>Stats</Title>

      <StatCards />
      <Types />

      <Graphs />

    </div>
  );
}
