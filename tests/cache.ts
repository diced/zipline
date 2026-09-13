import assert from 'assert/strict';
import { test } from 'node:test';
import { TimedCache } from '@/lib/timedCache';

test('cache entries expire at their TTL boundary', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const cache = new TimedCache<string, number>(100);
  cache.set('key', 42);

  t.mock.timers.tick(99);
  assert.equal(cache.get('key'), 42);

  t.mock.timers.tick(1);
  assert.equal(cache.get('key'), undefined);
  assert.equal(cache.has('key'), false);
});

test('cache replacements cancel the previous expiration timer', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const cache = new TimedCache<string, number>(100);
  cache.set('key', Date.now());

  t.mock.timers.tick(50);
  cache.set('key', Date.now());

  t.mock.timers.tick(50);
  assert.equal(cache.get('key'), 1050);

  t.mock.timers.tick(50);
  assert.equal(cache.get('key'), undefined);
});

test('cache deletion consumes a passkey challenge so it cannot be reused', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const cache = new TimedCache<string, { challenge: string }>();
  const options = { challenge: 'test-passkey-challenge' };
  cache.set('challenge-id', options);

  assert.equal(cache.has('challenge-id'), true);
  assert.equal(cache.get('challenge-id'), options);
  assert.equal(cache.delete('challenge-id'), true);
  assert.equal(cache.get('challenge-id'), undefined);
  assert.equal(cache.delete('challenge-id'), false);
});

test('cache checks expiry even when the expiration callback has not run', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const cache = new TimedCache<string, number>(100);
  cache.set('key', 42);

  t.mock.timers.setTime(1100);
  assert.equal(cache.get('key'), undefined);
});
