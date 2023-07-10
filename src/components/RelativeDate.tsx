import { relativeTime } from '@/lib/relativeTime';
import { Tooltip } from '@mantine/core';

export default function RelativeDate({
  date,
  from,
}: {
  date: Date | string | number;
  from?: Date | string | number;
}) {
  const d = new Date(date);
  const f = from ? new Date(from) : new Date();

  return (
    <Tooltip label={d.toLocaleString()}>
      <span>{relativeTime(d, f)}</span>
    </Tooltip>
  );
}
