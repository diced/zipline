export function isTruthy(...args: any[]): boolean {
  return args.every(Boolean);
}

export function eitherTrue(...args: any[]): boolean {
  return args.some(Boolean);
}
