import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coinTokens,
  createResolutionTimeline,
  resolutionEffect,
  resolutionStage,
} from '../lib/resolution.ts';

void test('resolution effects use only the private action result', () => {
  assert.equal(resolutionEffect(), 'missed');
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Steal Coins',
      others: 2,
      stolen: 3,
    }),
    'theft',
  );
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Steal Coins',
      others: 2,
      stolen: 0,
      blocked: true,
    }),
    'blocked',
  );
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Steal Coins',
      others: 2,
      stolen: 0,
    }),
    'empty',
  );
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Guard Room',
      others: 2,
      blocked: false,
    }),
    'guard',
  );
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Guard Room',
      others: 2,
      blocked: true,
    }),
    'blocked',
  );
  assert.equal(
    resolutionEffect({
      room: 'Tower',
      action: 'Count Coins',
      others: 0,
      coins: 0,
    }),
    'count',
  );
  assert.equal(
    resolutionEffect({ room: 'Tower', action: 'Investigate', others: 0 }),
    'investigate',
  );
});
void test('animated coin denominations preserve the exact successful theft amount', () => {
  for (let amount = 0; amount <= 100; amount++) {
    const tokens = coinTokens(amount);
    assert.equal(
      tokens.reduce((a, b) => a + b, 0),
      amount,
    );
    assert.ok(tokens.length <= 8);
    assert.ok(tokens.every((n) => n > 0));
  }
  assert.deepEqual(coinTokens(NaN), []);
});
void test('resolution is bounded to 2.4 seconds; reload and reduced motion settle immediately', () => {
  assert.equal(resolutionStage(1000, 1000), 'begin');
  assert.equal(resolutionStage(1000, 1650), 'impact');
  assert.equal(resolutionStage(1000, 3400), 'settled');
  assert.equal(resolutionStage(null, 1000), 'settled');
  assert.equal(resolutionStage(1000, 1001, true), 'settled');
});
void test('skip, privacy cover and reduced motion cannot be undone by later timer callbacks', () => {
  const timeline = createResolutionTimeline(1000);
  assert.equal(timeline.advance(1100), 'begin');
  assert.equal(timeline.advance(1200, true), 'settled');
  assert.equal(timeline.advance(1700), 'settled');
  assert.equal(timeline.advance(3400), 'settled');
  const reload = createResolutionTimeline(null);
  assert.equal(reload.advance(1200), 'settled');
});
