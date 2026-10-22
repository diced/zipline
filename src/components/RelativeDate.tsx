import { relativeTime } from '@/lib/relativeTime';
import { Tooltip } from '@mantine/core';
import { useState } from 'react';

export default function RelativeDate({
  date,
  from,
}: {
  date: Date | string | number;
  from?: Date | string | number;
}) {
  const [now] = useState(() => new Date());

  const d = new Date(date);
  const f = from !== undefined ? new Date(from) : now;

  return (
    <Tooltip label={d.toLocaleString()}>
      <span>{relativeTime(d, f)}</span>
    </Tooltip>
  );
}
