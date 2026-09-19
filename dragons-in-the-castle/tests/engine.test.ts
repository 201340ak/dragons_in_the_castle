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
  addBot,
  removeBot,
  PLAYER_AVATARS,
  type Game,
} from '../lib/engine.ts';
void test('chosen avatars are validated and included in public player views', () => {
  const g = create('CASTLE', 'p0', 'Player 0', {}, 0, false, PLAYER_AVATARS[3]);
  assert.equal(view(g, 'p0', 0).players[0].avatar, PLAYER_AVATARS[3]);
  assert.throws(() => join(g, 'p1', 'Player 1', 0, 'not-an-avatar'));
});
void test('host can add and remove ready bots in the lobby', () => {
  const g = create('CASTLE', 'p0', 'Player 0', {}, 0);
  addBot(g, 'p0', 1);
  addBot(g, 'p0', 2);
  assert.equal(g.players.length, 3);
  assert(g.players.slice(1).every((p) => p.bot && p.ready));
  removeBot(g, 'p0', g.players[1].id);
  assert.equal(g.players.length, 2);
  assert.throws(() => addBot(g, 'outsider', 3));
});
void test('bots use legal role-aware actions and never vote for themselves', () => {
  const g = create('CASTLE', 'p0', 'Player 0', {}, 0);
  for (let i = 0; i < 3; i++) addBot(g, 'p0', i + 1);
  g.players[0].ready = true;
  command(g, 'p0', { type: 'start' }, 4, () => 0.999);
  g.players.forEach((p, i) => (p.role = i === 1 ? 'Dragon' : 'Wizard'));
  g.deadline = 4;
  tick(g, 5);
  tick(g, 6);
  const round = g.history[0];
  for (const bot of g.players.filter((p) => p.bot)) {
    const choice = round.choices[bot.id];
    assert(choice);
    if (bot.role === 'Wizard') assert.notEqual(choice.action, 'Steal Coins');
  }
  g.phase = 'vote';
  g.deadline = 100;
  tick(g, 7);
  for (const bot of g.players.filter((p) => p.bot))
    assert.notEqual(round.votes[bot.id], bot.id);
});
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

void test('claim reactions are anonymous, changeable, removable and survive reconnect', () => {
  const g = game();
  g.phase = 'discussion';
  g.deadline = 10000;
  command(
    g,
    'p0',
    {
      type: 'claim',
      room: 'Tower',
      action: 'Count Coins',
      result: 'Ten coins.',
      statement: '',
    },
    2,
  );
  command(
    g,
    'p1',
    {
      type: 'claim-reaction',
      target: 'p0',
      reaction: 'skeptical',
      claimVersion: 1,
    },
    3,
  );
  command(
    g,
    'p2',
    {
      type: 'claim-reaction',
      target: 'p0',
      reaction: 'skeptical',
      claimVersion: 1,
    },
    3,
  );
  const snapshot = view(g, 'p3', 4);
  assert.equal(snapshot.claimReactions.p0.counts.skeptical, 2);
  assert.equal(snapshot.claimReactions.p0.mine, null);
  assert.deepEqual(Object.keys(snapshot.claimReactions.p0).sort(), [
    'counts',
    'mine',
    'version',
  ]);
  assert.equal(
    view(JSON.parse(JSON.stringify(g)), 'p1', 4).claimReactions.p0.mine,
    'skeptical',
  );
  command(
    g,
    'p1',
    {
      type: 'claim-reaction',
      target: 'p0',
      reaction: 'believable',
      claimVersion: 1,
    },
    5,
  );
  assert.equal(view(g, 'p0', 6).claimReactions.p0.counts.skeptical, 1);
  assert.equal(view(g, 'p0', 6).claimReactions.p0.counts.believable, 1);
  command(
    g,
    'p1',
    { type: 'claim-reaction', target: 'p0', reaction: null, claimVersion: 1 },
    7,
  );
  assert.equal(view(g, 'p0', 8).claimReactions.p0.counts.believable, 0);
  assert.deepEqual(g.ack, []);
  assert.deepEqual(g.history[0].votes, {});
  g.phase = 'over';
  assert.equal('reactions' in view(g, 'p0', 8).history![0], false);
});

function untimedTable(hostAdvance = false) {
  const g = game();
  g.settings = settings({
    roundTableUntimed: true,
    roundTableHostAdvance: hostAdvance,
  });
  resolve(g, 2);
  for (const p of g.players) command(g, p.id, { type: 'ack' }, 3);
  assert.equal(g.phase, 'discussion');
  assert.equal(g.deadline, 0);
  return g;
}

void test('Round table settings preserve timed legacy games and reject malformed flags', () => {
  assert.equal(settings({ discussion: 90 }).roundTableUntimed, false);
  assert.equal(settings({}).roundTableHostAdvance, false);
  assert.throws(() => settings({ roundTableUntimed: 'yes' as never }));
  assert.throws(() => settings({ roundTableHostAdvance: 1 as never }));
  const g = untimedTable();
  assert.throws(() =>
    command(
      g,
      'p0',
      { type: 'settings', settings: { roundTableUntimed: false } },
      4,
    ),
  );
});

void test('untimed Round table survives days offline, accepts edits and reactions, then advances on readiness', () => {
  let g = untimedTable();
  const later = 3 * 86400000;
  g = JSON.parse(JSON.stringify(g));
  tick(g, later);
  assert.equal(g.phase, 'discussion');
  assert.equal(g.deadline, 0);
  assert.throws(() =>
    command(g, 'p0', { type: 'discussion-ready', ready: true }, later),
  );
  const claim = {
    type: 'claim',
    room: 'Tower',
    action: 'Count Coins' as const,
    result: 'Ten',
    statement: '',
  };
  for (const p of g.players) command(g, p.id, claim, later + 1);
  command(g, 'p0', { type: 'discussion-ready', ready: true }, later + 2);
  command(g, 'p0', { ...claim, result: 'Nine' }, later + 3);
  assert.equal(g.ack.includes('p0'), false);
  command(
    g,
    'p1',
    {
      type: 'claim-reaction',
      target: 'p0',
      claimVersion: 2,
      reaction: 'skeptical',
    },
    later + 4,
  );
  command(g, 'p0', { type: 'discussion-ready', ready: true }, later + 5);
  command(g, 'p0', { type: 'discussion-ready', ready: false }, later + 6);
  assert.equal(g.ack.includes('p0'), false);
  for (const p of g.players.slice(0, 3))
    command(g, p.id, { type: 'discussion-ready', ready: true }, later + 7);
  tick(g, later * 2);
  assert.equal(g.phase, 'discussion');
  command(g, 'p3', { type: 'discussion-ready', ready: true }, later * 2 + 1);
  assert.equal(g.phase, 'vote');
  assert.equal(g.deadline, later * 2 + 1 + g.settings.vote * 1000);
});

void test('host advancement is opt-in, host-only, phase-bound and works for a banished host', () => {
  const locked = untimedTable();
  assert.throws(() =>
    command(locked, 'p0', { type: 'round-table-advance' }, 4),
  );
  locked.demo = true;
  assert.throws(() => command(locked, 'p0', { type: 'demo-next' }, 4));
  const g = untimedTable(true);
  assert.throws(() => command(g, 'p1', { type: 'round-table-advance' }, 4));
  g.players[0].active = false;
  command(g, 'p0', { type: 'round-table-advance' }, 5);
  assert.equal(g.phase, 'vote');
  assert.throws(() => command(g, 'p0', { type: 'round-table-advance' }, 6));
  const timed = game();
  timed.phase = 'discussion';
  timed.settings.roundTableHostAdvance = true;
  assert.throws(() => command(timed, 'p0', { type: 'round-table-advance' }, 5));
});

void test('untimed readiness ignores spectators and bots post claims automatically', () => {
  const g = untimedTable();
  g.players[3].active = false;
  g.players[2].bot = true;
  for (const p of g.players.slice(0, 2)) {
    command(
      g,
      p.id,
      {
        type: 'claim',
        room: 'Tower',
        action: 'Count Coins',
        result: 'Ten',
        statement: '',
      },
      10,
    );
    command(g, p.id, { type: 'discussion-ready', ready: true }, 11);
  }
  assert.equal(g.phase, 'vote');
  assert.ok(g.history[0].claims.p2);
});

void test('reaction permissions and claim version prevent stale endorsements', () => {
  const g = game();
  g.phase = 'discussion';
  g.deadline = 10000;
  const claim = {
    type: 'claim',
    room: 'Tower',
    action: 'Count Coins' as const,
    result: 'Ten coins.',
    statement: '',
  };
  command(g, 'p0', claim, 2);
  const react = {
    type: 'claim-reaction',
    target: 'p0',
    reaction: 'funny' as const,
    claimVersion: 1,
  };
  assert.throws(() => command(g, 'p0', react, 3));
  assert.throws(() => command(g, 'p1', { ...react, target: 'p2' }, 3));
  assert.throws(() =>
    command(g, 'p1', { ...react, reaction: 'invalid' as never }, 3),
  );
  g.players[3].active = false;
  assert.throws(() => command(g, 'p3', react, 3));
  command(g, 'p1', react, 3);
  command(g, 'p0', { ...claim, result: 'Five coins.' }, 4);
  assert.equal(view(g, 'p1', 5).claimReactions.p0.mine, null);
  assert.equal(view(g, 'p1', 5).claimReactions.p0.counts.funny, 0);
  assert.throws(() => command(g, 'p1', react, 5));
  command(g, 'p1', { ...react, claimVersion: 2 }, 6);
  g.phase = 'vote';
  assert.throws(() => command(g, 'p1', { ...react, claimVersion: 2 }, 7));
  assert.equal(view(g, 'p2', 7).claimReactions.p0.counts.funny, 1);
  g.phase = 'selection';
  assert.deepEqual(view(g, 'p2', 7).claimReactions, {});
});
void test('successful theft and count after simultaneous resolution', () => {
  const g = game();
  g.settings.showRoomAttendance = true;
  g.history[0].choices = {
    p0: { room: 'Treasury', action: 'Steal Coins' },
    p1: { room: 'Treasury', action: 'Count Coins' },
  };
  resolve(g, 2);
  assert.equal(g.rooms.Treasury, 8);
  assert.equal(g.history[0].results.p1.coins, 8);
  assert.equal(g.history[0].results.p0.others, 1);
});

void test('room attendance is opt-in and legacy private results are filtered', () => {
  assert.equal(settings({}).showRoomAttendance, false);
  assert.equal(settings({}).gameMode, 'steal-the-treasure');
  assert.throws(() => settings({ showRoomAttendance: 'true' as never }));
  assert.throws(() => settings({ gameMode: 'eat-the-king' as never }));
  const g = game();
  g.history[0].choices = {
    p0: { room: 'Tower', action: 'Guard Room' },
    p1: { room: 'Tower', action: 'Count Coins' },
  };
  resolve(g, 2);
  assert.equal('others' in view(g, 'p1', 3).me.result!, false);
  assert.equal(view(g, 'p1', 3).me.result!.coins, 10);
  // A saved game from before this setting may contain the old attendance field.
  g.history[0].results.p1.others = 1;
  assert.equal('others' in view(g, 'p1', 3).me.result!, false);
  g.players[1].bot = true;
  g.phase = 'discussion';
  g.deadline = 10000;
  tick(g, 4);
  assert.doesNotMatch(g.history[0].claims.p1.result, /other player/);
  g.phase = 'over';
  assert.equal('others' in view(g, 'p1', 5).history![0].results.p1, false);
  g.settings.showRoomAttendance = true;
  assert.equal(view(g, 'p1', 5).me.result!.others, 1);
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
  assert.deepEqual(settings({ dragons: [2, 2, 3] }).dragons, [1, 2, 3]);
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

void test('theft ranges reject invalid amounts and preserve legacy settings', () => {
  for (const [stealMin, stealMax] of [
    [0, 3],
    [3, 2],
    [1, 6],
    [1.5, 3],
  ])
    assert.throws(() => settings({ coins: 5, stealMin, stealMax }));
  assert.equal(settings({ coins: 5, steal: 2 }).stealMin, 2);
  assert.equal(settings({ coins: 5, steal: 2 }).stealMax, 2);
  assert.deepEqual(settings({ dragons: [3, 3, 3] }).dragons, [1, 2, 3]);
  for (const count of [4, 6, 7, 9, 10, 12]) {
    const g = game(count);
    g.phase = 'over';
    command(g, 'p0', { type: 'again' }, 2);
    g.players.forEach((p) => (p.ready = true));
    command(g, 'p0', { type: 'start' }, 3);
    assert.equal(
      g.players.filter((p) => p.role === 'Dragon').length,
      count <= 6 ? 1 : count <= 9 ? 2 : 3,
    );
  }
});
void test('dragons choose theft amounts and remaining coins constrain the choice', () => {
  for (const remaining of [0, 1, 3, 5]) {
    const g = game();
    g.settings = settings({ coins: 5, stealMin: 2, stealMax: 5 });
    g.rooms.Tower = remaining;
    const bounds = view(g, 'p0', 2).me.theftBounds!.Tower;
    assert.deepEqual(bounds, { min: Math.min(2, remaining), max: remaining });
    assert.equal(view(g, 'p1', 2).me.theftBounds, undefined);
    assert.throws(() =>
      command(
        g,
        'p0',
        { type: 'action', room: 'Tower', action: 'Steal Coins', amount: 6 },
        2,
      ),
    );
    const amount = Math.min(3, remaining);
    command(
      g,
      'p0',
      { type: 'action', room: 'Tower', action: 'Steal Coins', amount },
      2,
    );
    resolve(g, 3);
    assert.equal(g.history[0].results.p0.stolen, amount);
  }
});
void test('scarce coins are awarded by shuffled priority, not submission order', () => {
  for (const random of [() => 0, () => 0.999]) {
    const g = game();
    g.rooms.Tower = 1;
    g.history[0].choices = {
      p0: { room: 'Tower', action: 'Steal Coins', amount: 3 },
      p1: { room: 'Tower', action: 'Steal Coins', amount: 3 },
    };
    resolve(g, 2, random);
    assert.equal(g.rooms.Tower, 0);
    assert.equal(g.history[0].results[random() === 0 ? 'p1' : 'p0'].stolen, 1);
  }
});

void test('investigation waits for the final human and includes late entrants', () => {
  const g = game();
  g.settings.showRoomAttendance = true;
  command(g, 'p1', { type: 'action', room: 'Tower', action: 'Investigate' }, 2);
  command(
    g,
    'p0',
    { type: 'action', room: 'Treasury', action: 'Count Coins' },
    3,
  );
  command(
    g,
    'p2',
    { type: 'action', room: 'Library', action: 'Count Coins' },
    4,
  );
  tick(g, 5);
  assert.equal(g.phase, 'selection');
  assert.equal(view(g, 'p1', 5).me.result, undefined);
  assert.deepEqual(g.history[0].results, {});
  command(g, 'p3', { type: 'action', room: 'Tower', action: 'Count Coins' }, 6);
  assert.equal(g.phase, 'results');
  assert.equal(view(g, 'p1', 6).me.result?.others, 1);
  const frozen = JSON.stringify(g.history[0].results);
  assert.throws(() =>
    command(
      g,
      'p3',
      { type: 'action', room: 'Treasury', action: 'Count Coins' },
      7,
    ),
  );
  assert.throws(() => resolve(g, 7));
  assert.equal(JSON.stringify(g.history[0].results), frozen);
});
void test('deadline closes selection and mixed bot games still wait for humans', () => {
  const g = game();
  g.players[2].bot = true;
  g.players[3].bot = true;
  command(g, 'p1', { type: 'action', room: 'Tower', action: 'Investigate' }, 2);
  assert.equal(g.phase, 'selection');
  assert.equal(view(g, 'p1', 2).me.result, undefined);
  tick(g, g.deadline);
  assert.equal(g.phase, 'results');
  assert.equal(g.history[0].choices.p0, undefined);
  assert.equal(view(g, 'p0', g.deadline).me.result, undefined);
});

void test('discussion requires claims, permits undo and edits clear readiness', () => {
  const g = game();
  g.phase = 'discussion';
  g.deadline = 100;
  assert.throws(() =>
    command(g, 'p0', { type: 'discussion-ready', ready: true }, 2),
  );
  for (const p of g.players)
    command(
      g,
      p.id,
      {
        type: 'claim',
        room: 'Tower',
        action: 'Investigate',
        result: 'A story',
        statement: '',
      },
      3,
    );
  command(g, 'p0', { type: 'discussion-ready', ready: true }, 4);
  assert(view(g, 'p0', 4).ack);
  command(g, 'p0', { type: 'discussion-ready', ready: false }, 5);
  assert(!view(g, 'p0', 5).ack);
  command(g, 'p0', { type: 'discussion-ready', ready: true }, 6);
  command(
    g,
    'p0',
    {
      type: 'claim',
      room: 'Tower',
      action: 'Investigate',
      result: 'Edited',
      statement: '',
    },
    7,
  );
  assert(!view(g, 'p0', 7).ack);
  for (const p of g.players)
    command(g, p.id, { type: 'discussion-ready', ready: true }, 8);
  assert.equal(g.phase, 'vote');
  assert.equal(g.ack.length, 0);
});
void test('discussion ignores spectators, bots are ready and missing humans wait for deadline', () => {
  const g = game();
  g.phase = 'discussion';
  g.deadline = 100;
  g.players[3].active = false;
  g.players[2].bot = true;
  command(
    g,
    'p0',
    {
      type: 'claim',
      room: 'Tower',
      action: 'Count Coins',
      result: '',
      statement: '',
    },
    2,
  );
  command(g, 'p0', { type: 'discussion-ready', ready: true }, 3);
  assert.equal(g.phase, 'discussion');
  assert.throws(() =>
    command(g, 'p3', { type: 'discussion-ready', ready: true }, 3),
  );
  tick(g, 100);
  assert.equal(g.phase, 'vote');
});

void test('anonymous vote intentions move, lock once and survive reconnects', () => {
  const g = game();
  g.phase = 'vote';
  g.deadline = 100;
  assert.equal(view(g, 'p0', 2).me.voteTarget, undefined);
  command(g, 'p0', { type: 'vote-intent', target: 'p1' }, 2);
  assert.deepEqual(view(g, 'p2', 2).liveVotes?.p1, { tentative: 1, locked: 0 });
  assert.equal(view(g, 'p2', 2).me.voteTarget, undefined);
  assert.equal('voteIntents' in view(g, 'p2', 2), false);
  command(g, 'p0', { type: 'vote-intent', target: 'skip' }, 3);
  assert.deepEqual(view(g, 'p1', 3).liveVotes?.p1, { tentative: 0, locked: 0 });
  assert.equal(view(g, 'p0', 3).me.voteTarget, 'skip');
  command(g, 'p0', { type: 'vote', target: 'skip' }, 4);
  assert.deepEqual(view(g, 'p1', 4).liveVotes?.skip, {
    tentative: 0,
    locked: 1,
  });
  assert.throws(() =>
    command(g, 'p0', { type: 'vote-intent', target: 'p2' }, 5),
  );
  assert.throws(() => command(g, 'p0', { type: 'vote', target: 'p2' }, 5));
  g.players[3].active = false;
  assert.throws(() =>
    command(g, 'p3', { type: 'vote-intent', target: 'p1' }, 5),
  );
  assert.throws(() =>
    command(g, 'p1', { type: 'vote-intent', target: 'p3' }, 5),
  );
  assert.equal(view(g, 'p3', 5).liveVotes?.skip.locked, 1);
});
void test('tentative votes never count at deadline and disappear next round', () => {
  const g = game();
  g.phase = 'vote';
  g.deadline = 100;
  for (const p of g.players)
    command(g, p.id, { type: 'vote-intent', target: 'p0' }, 2);
  assert.equal(g.phase, 'vote');
  tick(g, 100);
  assert.equal(g.phase, 'verdict');
  assert.deepEqual(g.history[0].totals, {});
  assert.equal(view(g, 'p1', 100).liveVotes, undefined);
  for (const p of g.players) command(g, p.id, { type: 'ack' }, 101);
  assert.equal(g.phase, 'selection');
  assert.equal(view(g, 'p0', 101).me.voteTarget, undefined);
});
