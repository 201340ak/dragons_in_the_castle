import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  create,
  join,
  command,
  resolve,
  tally,
  tick,
  view,
  settings,
  type Game,
} from '../lib/engine.ts';
function game(count = 4): Game {
  const g = create('CASTLE', 'p0', 'Player 0', {}, 0);
  for (let i = 1; i < count; i++) join(g, `p${i}`, `Player ${i}`, 0);
  g.players.forEach((p) => (p.ready = true));
  command(g, 'p0', { type: 'start' }, 0, () => 0.999);
  g.players.forEach((p, i) => (p.role = i === 0 ? 'Dragon' : 'Wizard'));
  g.deadline = 0;
  tick(g, 1);
  return g;
}
void test('successful theft and count after simultaneous resolution', () => {
  const g = game();
  g.history[0].choices = {
    p0: { room: 'Treasury', action: 'Steal Coins' },
    p1: { room: 'Treasury', action: 'Count Coins' },
  };
  resolve(g, 2);
  assert.equal(g.rooms.Treasury, 8);
  assert.equal(g.history[0].results.p1.coins, 8);
  assert.equal(g.history[0].results.p0.others, 1);
});
void test('guard blocks all theft and reports attempts', () => {
  const g = game();
  g.history[0].choices = {
    p0: { room: 'Tower', action: 'Steal Coins' },
    p1: { room: 'Tower', action: 'Guard Room' },
  };
  resolve(g, 2);
  assert.equal(g.rooms.Tower, 10);
  assert.equal(g.history[0].results.p0.stolen, 0);
  assert.equal(g.history[0].results.p1.blocked, true);
});
void test('multiple thefts share finite gold without negative totals', () => {
  for (let coins = 0; coins <= 10; coins++) {
    const g = game();
    g.rooms.Tower = coins;
    g.history[0].choices = {
      p0: { room: 'Tower', action: 'Steal Coins' },
      p1: { room: 'Tower', action: 'Steal Coins' },
      p2: { room: 'Tower', action: 'Steal Coins' },
    };
    resolve(g, 2);
    assert.equal(g.rooms.Tower, Math.max(0, coins - 6));
    assert.equal(
      Object.values(g.history[0].results).reduce(
        (n, r) => n + (r.stolen || 0),
        0,
      ),
      Math.min(6, coins),
    );
  }
});
void test('empty rooms retain coins and no absent player receives information', () => {
  const g = game();
  resolve(g, 2);
  assert.equal(g.rooms.Library, 10);
  assert.deepEqual(g.history[0].results, {});
});
void test('investigation groups actions without identities', () => {
  const g = game();
  g.history[0].choices = {
    p0: { room: 'Tower', action: 'Steal Coins' },
    p1: { room: 'Tower', action: 'Guard Room' },
    p2: { room: 'Tower', action: 'Investigate' },
  };
  resolve(g, 2);
  assert.deepEqual(g.history[0].results.p2.groups, {
    protective: 1,
    informational: 1,
    unknown: 1,
  });
});
void test('tied, skipped and insufficient votes never banish', () => {
  for (const votes of [
    { p0: 'p1', p1: 'p0', p2: 'p1', p3: 'p0' },
    { p0: 'skip', p1: 'skip', p2: 'skip', p3: 'skip' },
    { p0: 'p1', p2: 'p1' },
  ]) {
    const g = game();
    g.history[0].votes = votes as Record<string, string>;
    tally(g, 2);
    assert.equal(g.players.filter((p) => p.active).length, 4);
  }
});
void test('strict majority banishes and immediately awards Wizards', () => {
  const g = game();
  g.history[0].votes = { p1: 'p0', p2: 'p0', p3: 'p0' };
  tally(g, 2);
  assert.equal(g.players[0].active, false);
  assert.equal(g.winner, 'Wizards');
  assert.equal(g.phase, 'over');
});
void test('last coins award Dragons before a vote can happen', () => {
  const g = game();
  Object.keys(g.rooms).forEach((r) => (g.rooms[r] = 0));
  g.rooms.Tower = 1;
  g.history[0].choices = { p0: { room: 'Tower', action: 'Steal Coins' } };
  resolve(g, 2);
  assert.equal(g.winner, 'Dragons');
  assert.throws(() => command(g, 'p1', { type: 'vote', target: 'p0' }, 3));
});
void test('reconnection preserves role and sealed choice', () => {
  const g = game();
  command(g, 'p0', { type: 'action', room: 'Tower', action: 'Steal Coins' }, 2);
  const before = view(g, 'p0', 2);
  join(g, 'p0', 'Replacement', 3);
  assert.equal(g.players.length, 4);
  assert.deepEqual(view(g, 'p0', 3).me, before.me);
});
void test('duplicate submissions, late actions, wizard theft, spectators and host impersonation rejected', () => {
  const g = game();
  command(g, 'p0', { type: 'action', room: 'Tower', action: 'Steal Coins' }, 2);
  assert.throws(() =>
    command(
      g,
      'p0',
      { type: 'action', room: 'Tower', action: 'Steal Coins' },
      3,
    ),
  );
  assert.throws(() =>
    command(
      g,
      'p1',
      { type: 'action', room: 'Tower', action: 'Steal Coins' },
      3,
    ),
  );
  assert.throws(() =>
    command(
      g,
      'p1',
      { type: 'action', room: 'Tower', action: 'Count Coins' },
      g.deadline,
    ),
  );
  g.players[1].active = false;
  assert.throws(() =>
    command(
      g,
      'p1',
      { type: 'action', room: 'Tower', action: 'Count Coins' },
      3,
    ),
  );
  assert.throws(() => command(g, 'p1', { type: 'settings', settings: {} }, 3));
  assert.throws(() => view(g, 'outsider', 3));
});
void test('projection never leaks other roles, submissions, results, totals or history', () => {
  const g = game();
  g.history[0].choices = { p0: { room: 'Tower', action: 'Steal Coins' } };
  const v = view(g, 'p1', 2);
  assert.equal(v.me.role, 'Wizard');
  assert.deepEqual(v.me.allies, []);
  assert.equal(v.players[0].role, undefined);
  assert.equal(v.coins, undefined);
  assert.equal(v.history, undefined);
  assert.equal(JSON.stringify(v).includes('Steal Coins'), false);
  assert.equal(v.players[0].submitted, true);
});
void test('Dragons know allies; banished roles remain hidden by default', () => {
  const g = game(7);
  g.players[1].role = 'Dragon';
  assert.deepEqual(view(g, 'p0', 2).me.allies, ['Player 1']);
  g.players[1].active = false;
  assert.equal(view(g, 'p2', 2).players[1].role, undefined);
  g.settings.reveal = true;
  assert.equal(view(g, 'p2', 2).players[1].role, 'Dragon');
});
void test('claims may lie and be edited; votes cannot be replaced', () => {
  const g = game();
  g.phase = 'discussion';
  command(
    g,
    'p1',
    {
      type: 'claim',
      room: 'Dungeon',
      action: 'Guard Room',
      result: 'A lie',
      statement: '',
    },
    2,
  );
  command(
    g,
    'p1',
    {
      type: 'claim',
      room: 'Tower',
      action: 'Count Coins',
      result: 'A second lie',
      statement: '',
    },
    3,
  );
  assert.equal(g.history[0].claims.p1.result, 'A second lie');
  g.phase = 'vote';
  command(g, 'p1', { type: 'vote', target: 'skip' }, 4);
  assert.throws(() => command(g, 'p1', { type: 'vote', target: 'p0' }, 5));
});
void test('settings enforce minority and bounded input', () => {
  assert.throws(() => settings({ dragons: [2, 2, 3] }));
  assert.throws(() => settings({ rooms: ['Tower', 'Tower'] }));
  assert.throws(() => settings({ coins: -1 }));
});
void test('play again clears secrets and returns everyone to lobby', () => {
  const g = game();
  g.phase = 'over';
  g.winner = 'Wizards';
  command(g, 'p0', { type: 'again' }, 2);
  assert.equal(g.phase, 'lobby');
  assert.equal(g.history.length, 0);
  assert(g.players.every((p) => p.role === undefined && p.active));
});
