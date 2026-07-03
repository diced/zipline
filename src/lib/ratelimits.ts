export const secondlyRatelimit = (seconds: number, max: number = 1) => ({
  config: { rateLimit: { max, timeWindow: `${seconds} seconds`, allowList: [] } },
});
