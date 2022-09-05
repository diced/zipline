import { SimpleGrid } from "@mantine/core";
import { FileIcon, UserIcon } from "components/icons";
import StatCard from "components/StatCard";
import { useStats } from "lib/queries/stats";
import { Database, Eye, Users } from "react-feather";

export function StatCards() {
  const stats = useStats();

  return (
    <SimpleGrid
      cols={4}
      breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 },
      ]}
      className='mt-3'
    >
      <StatCard stat={{
        title: 'UPLOADED FILES',
        value: stats.isSuccess ? stats.data.count.toLocaleString() : '...',
        desc: 'files have been uploaded',
        icon: (
          <FileIcon />
        ),
      }}/>

      <StatCard stat={{
        title: 'STORAGE',
        value: stats.isSuccess ? stats.data.size : '...',
        desc: 'of storage used',
        icon: (
          <Database size={15} />
        ),
      }}/>

      <StatCard stat={{
        title: 'VIEWS',
        value: stats.isSuccess ? stats.data.views_count.toLocaleString() : '...',
        desc: 'total page views',
        icon: (
          <Eye size={15} />
        ),
      }}/>

      <StatCard stat={{
        title: 'USERS',
        value: stats.isSuccess ? stats.data.count_users.toLocaleString() : '...',
        desc: 'total registered users',
        icon: (
          <Users size={15} />
        ),
      }}/>
    </SimpleGrid>
  );
}