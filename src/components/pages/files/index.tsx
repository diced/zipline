import type { SafeConfig } from '@/lib/config/safe';
import { Title } from '@mantine/core';
import Files from './Files';
import FavoriteFiles from './FavoriteFiles';

export default function DashbaordFiles({ config }: { config: SafeConfig }) {
  return (
    <>
      <Title>Files</Title>

      <FavoriteFiles config={config} />

      <Files config={config} />
    </>
  );
}
