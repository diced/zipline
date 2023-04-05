export function exclude<T, Key extends keyof T>(obj: T, keys: Key[]): Omit<T, Key> {
  for (const key of keys) {
    delete obj[key];
  }
  return obj;
}

export function pick<T, Key extends keyof T>(obj: T, keys: Key[]): Pick<T, Key> {
  const newObj: unknown = {};

  for (const key of keys) {
    newObj[key] = obj[key];
  }

  return newObj as Pick<T, Key>;
}
