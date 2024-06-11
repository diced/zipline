import dayjs from 'dayjs';
import dayjsDuration from 'dayjs/plugin/duration';
import dayJsrelativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(dayJsrelativeTime);
dayjs.extend(dayjsDuration);

export function relativeTime(to: Date, from: Date = new Date()) {
  if (!to) return null;

  if (to.getTime() < from.getTime()) {
    return dayjs(to).from(from);
  } else {
    return dayjs(from).to(to);
  }
}

export function humanizeDuration(duration: number, unit: dayjsDuration.DurationUnitType = 'seconds') {
  return dayjs.duration(duration, unit).humanize();
}
