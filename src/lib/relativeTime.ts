import dayjs from "dayjs";
import dayJsrelativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(dayJsrelativeTime);

export function relativeTime(to: Date, from: Date = new Date()) {
  if (!to) return null;

  if (to.getTime() < from.getTime()) {
    return dayjs(to).from(from);
  } else {
    return dayjs(from).to(to);
  }
}