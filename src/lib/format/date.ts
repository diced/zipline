import dayjs from 'dayjs';
import config from 'lib/config';

export default function date() {
  return dayjs().format(config.uploader.format_date);
}
