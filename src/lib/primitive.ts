export const MAX_INT32 = 2_147_483_647;

export function isTruthy(...args: any[]): boolean {
  return args.every(Boolean);
}

export function eitherTrue(...args: any[]): boolean {
  return args.some(Boolean);
}
