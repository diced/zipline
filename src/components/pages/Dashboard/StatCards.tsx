import { SimpleGrid } from "@mantine/core";
import { FileIcon, UserIcon } from "components/icons";
import StatCard from "components/StatCard";
import { percentChange } from "lib/clientUtils";
import { useStats } from "lib/queries/stats";
import { Database, Eye, Users } from "react-feather";

export function StatCards() {
  const stats  = useStats();
  const latest = stats.data?.[0];
  const before = stats.data?.[1];

  return (
    <SimpleGrid
      cols={4}
      breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 },
      ]}
    >
      <StatCard stat={{
        title: 'UPLOADED FILES',
        value: stats.isSuccess ? latest.data.count.toLocaleString() : '...',
        desc: 'files have been uploaded',
        icon: (
          <FileIcon />
        ),
        diff: stats.isSuccess ? percentChange(before.data.count, latest.data.count) : undefined,
      }}/>

      <StatCard stat={{
        title: 'STORAGE',
        value: stats.isSuccess ? latest.data.size : '...',
        desc: 'of storage used',
        icon: (
          <Database size={15} />
        ),
        diff: stats.isSuccess ? percentChange(before.data.size_num, latest.data.size_num) : undefined,
      }}/>

      <StatCard stat={{
        title: 'VIEWS',
        value: stats.isSuccess ? latest.data.views_count.toLocaleString() : '...',
        desc: 'total page views',
        icon: (
          <Eye size={15} />
        ),
        diff: stats.isSuccess ? percentChange(before.data.views_count, latest.data.views_count) : undefined,
      }}/>

      <StatCard stat={{
        title: 'USERS',
        value: stats.isSuccess ? latest.data.count_users.toLocaleString() : '...',
        desc: 'total registered users',
        icon: (
          <Users size={15} />
        ),
        diff: stats.isSuccess ? percentChange(before.data.count_users, latest.data.count_users) : undefined,
      }}/>
    </SimpleGrid>
  );
}