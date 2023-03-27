import { randomUUID } from 'crypto';

export default function uuid() {
  return randomUUID({ disableEntropyCache: true });
}
