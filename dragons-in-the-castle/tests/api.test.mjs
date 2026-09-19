import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base = process.env.TEST_URL || 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

void test('live untimed Round table persists anonymous reactions and enforces claim revisions and host advancement', async () => {
  const { tokens, code, g } = await group({
    discussion: 1,
    roundTableUntimed: true,
    roundTableHostAdvance: true,
    vote: 120,
  });
  const send = (i, type, phase, extra = {}, ok = true) =>
    api(tokens[i], { code, round: g.round, type, phase, ...extra }, ok);
  for (let i = 0; i < 4; i++)
    await send(i, 'action', 'selection', {
      room: 'Tower',
      action: 'Count Coins',
    });
  for (let i = 0; i < 4; i++) await send(i, 'ack', 'results');
  await sleep(1100);
  let state = await api(tokens[0], { type: 'sync', code });
  assert.equal(state.phase, 'discussion');
  assert.equal(state.deadline, 0);
  const claim = {
    room: 'Tower',
    action: 'Count Coins',
    result: 'Ten',
    statement: '',
  };
  state = await send(0, 'claim', 'discussion', claim);
  const hostId = state.me.id;
  const reaction = { target: hostId, reaction: 'interesting', claimVersion: 1 };
  await Promise.all([
    send(1, 'claim-reaction', 'discussion', reaction),
    send(2, 'claim-reaction', 'discussion', reaction),
  ]);
  state = await api(tokens[3], { type: 'sync', code });
  assert.equal(state.claimReactions[hostId].counts.interesting, 2);
  assert.equal(state.claimReactions[hostId].mine, null);
  assert.deepEqual(Object.keys(state.claimReactions[hostId]).sort(), [
    'counts',
    'mine',
    'version',
  ]);
  const reconnect = await api(tokens[1], { type: 'sync', code });
  assert.equal(reconnect.claimReactions[hostId].mine, 'interesting');
  await send(1, 'claim-reaction', 'discussion', {
    ...reaction,
    reaction: null,
  });
  state = await send(0, 'claim', 'discussion', { ...claim, result: 'Nine' });
  assert.equal(state.claimReactions[hostId].counts.interesting, 0);
  await send(1, 'claim-reaction', 'discussion', reaction, false);
  await api(
    tokens[1],
    {
      type: 'claim-reaction',
      code,
      round: g.round - 1,
      phase: 'discussion',
      ...reaction,
      claimVersion: 2,
    },
    false,
  );
  await send(1, 'round-table-advance', 'discussion', {}, false);
  await send(0, 'round-table-advance', 'results', {}, false);
  state = await send(0, 'round-table-advance', 'discussion');
  assert.equal(state.phase, 'vote');
  assert(state.deadline > state.serverTime);
  await send(
    2,
    'claim-reaction',
    'discussion',
    { ...reaction, claimVersion: 2 },
    false,
  );
  await send(0, 'round-table-advance', 'discussion', {}, false);
});
async function api(token, body, ok = true) {
  const r = await fetch(base + '/api/game', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const v = await r.json();
  assert.equal(r.ok, ok, JSON.stringify(v));
  return v;
}
async function group(settings = {}) {
  const tokens = Array.from({ length: 4 }, () =>
    randomBytes(32).toString('hex'),
  );
  let g = await api(tokens[0], {
    type: 'create',
    name: 'Host',
    settings: { discussion: 1, ...settings },
  });
  const code = g.code;
  for (let i = 1; i < 4; i++)
    await api(tokens[i], { type: 'join', code, name: `Guest ${i}` });
  for (let i = 0; i < 4; i++) await api(tokens[i], { type: 'ready', code });
  g = await api(tokens[0], { type: 'start', code });
  const views = await Promise.all(
    tokens.map((t) => api(t, { type: 'sync', code })),
  );
  for (const t of tokens)
    g = await api(t, { type: 'ack', code, round: 0, phase: 'reveal' });
  return { tokens, code, g, views };
}
void test('live four-player round: private roles, concurrent actions, lying claims, majority, replay', async () => {
  const { tokens, code, views } = await group();
  let g;
  const dragon = views.findIndex((v) => v.me.role === 'Dragon');
  const wizard = views.findIndex((v) => v.me.role === 'Wizard');
  assert.equal(views.filter((v) => v.me.role === 'Dragon').length, 1);
  for (const v of views) {
    assert(v.players.every((p) => !('role' in p)));
    assert(!('history' in v));
  }
  await api(randomBytes(32).toString('hex'), { type: 'sync', code }, false);
  await api(tokens[1], { type: 'settings', code, settings: {} }, false);
  await api(
    tokens[wizard],
    {
      type: 'action',
      code,
      round: 1,
      phase: 'selection',
      room: 'Tower',
      action: 'Steal Coins',
    },
    false,
  );
  // Race duplicate submissions against the same aggregate; precisely one wins.
  const duplicate = await Promise.all(
    [0, 1].map(() =>
      fetch(base + '/api/game', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens[dragon]}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'action',
          code,
          round: 1,
          phase: 'selection',
          room: 'Tower',
          action: 'Steal Coins',
        }),
      }),
    ),
  );
  assert.equal(duplicate.filter((r) => r.ok).length, 1);
  await Promise.all(duplicate.map((r) => r.text()));
  const privateView = await api(tokens[wizard], { type: 'sync', code });
  assert.equal(JSON.stringify(privateView).includes('Steal Coins'), false);
  await Promise.all(
    tokens.map((t, i) =>
      i === dragon
        ? Promise.resolve()
        : api(t, {
            type: 'action',
            code,
            round: 1,
            phase: 'selection',
            room: i === wizard ? 'Tower' : 'Library',
            action: 'Count Coins',
          }),
    ),
  );
  g = await api(tokens[wizard], { type: 'sync', code });
  assert.equal(g.phase, 'results');
  assert.equal(g.me.result.coins, 8);
  assert.equal(g.settings.showRoomAttendance, false);
  assert.equal(g.settings.gameMode, 'steal-the-treasure');
  assert.equal('others' in g.me.result, false);
  const rejoin = await api(tokens[wizard], {
    type: 'join',
    code,
    name: 'New name',
  });
  assert.deepEqual(rejoin.me, g.me);
  assert.equal(rejoin.players.length, 4);
  for (const t of tokens)
    g = await api(t, { type: 'ack', code, round: 1, phase: 'results' });
  await api(tokens[wizard], {
    type: 'claim',
    code,
    round: 1,
    phase: 'discussion',
    room: 'Dungeon',
    action: 'Guard Room',
    result: 'I blocked a theft',
    statement: 'This claim is deliberately false.',
  });
  await api(tokens[wizard], {
    type: 'claim',
    code,
    round: 1,
    phase: 'discussion',
    room: 'Treasury',
    action: 'Investigate',
    result: 'Edited claim',
    statement: '',
  });
  await sleep(1100);
  g = await api(tokens[0], { type: 'sync', code });
  assert.equal(g.phase, 'vote');
  for (let i = 0; i < 4; i++)
    g = await api(tokens[i], {
      type: 'vote',
      code,
      round: 1,
      phase: 'vote',
      target: views[dragon].me.id,
    });
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'Wizards');
  assert.equal(g.history.length, 1);
  assert.equal(g.history[0].results[views[dragon].me.id].stolen, 2);
  assert(g.players.every((p) => p.role));
  g = await api(tokens[0], { type: 'again', code });
  assert.equal(g.phase, 'lobby');
  assert(g.players.every((p) => !p.role));
});
void test('live last-coin win takes priority before discussion or voting', async () => {
  const { tokens, code, views } = await group({
    rooms: ['Treasury'],
    coins: 1,
    steal: 2,
  });
  let g;
  for (let i = 0; i < 4; i++)
    g = await api(tokens[i], {
      type: 'action',
      code,
      round: 1,
      phase: 'selection',
      room: 'Treasury',
      action: views[i].me.role === 'Dragon' ? 'Steal Coins' : 'Count Coins',
    });
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'Dragons');
  assert.equal(g.coins.Treasury, 0);
});
void test('live deadlines advance without missing players and reject stale submissions', async () => {
  const { tokens, code } = await group({ selection: 1 });
  await sleep(1100);
  const g = await api(tokens[0], { type: 'sync', code });
  assert.equal(g.phase, 'results');
  await api(
    tokens[0],
    {
      type: 'action',
      code,
      round: 1,
      phase: 'selection',
      room: 'Tower',
      action: 'Count Coins',
    },
    false,
  );
});

void test('live selection stays private until the last player, then freezes', async () => {
  const { tokens, code, g } = await group({
    showRoomAttendance: true,
    selection: 120,
    stealMin: 2,
    stealMax: 5,
    coins: 5,
  });
  const body = {
    type: 'action',
    code,
    round: g.round,
    phase: 'selection',
    room: 'Tower',
    action: 'Investigate',
  };
  const first = await api(tokens[0], body);
  assert.equal(first.phase, 'selection');
  assert.equal(first.me.result, undefined);
  await Promise.all([
    api(tokens[1], { ...body, room: 'Library' }),
    api(tokens[2], { ...body, room: 'Treasury' }),
  ]);
  const waiting = await api(tokens[0], { type: 'sync', code });
  assert.equal(waiting.phase, 'selection');
  assert.equal(waiting.me.result, undefined);
  assert.equal(waiting.players.filter((p) => p.submitted).length, 3);
  const last = await api(tokens[3], body);
  assert.equal(last.phase, 'results');
  const result = await api(tokens[0], { type: 'sync', code });
  assert.equal(result.me.result.others, 1);
  assert(result.revision > waiting.revision);
  await api(tokens[3], { ...body, room: 'Dungeon' }, false);
  const reconnect = await api(tokens[0], { type: 'sync', code });
  assert.deepEqual(reconnect.me.result, result.me.result);
});

void test('live discussion readiness and anonymous voting persist and reject stale writes', async () => {
  const { tokens, code, g } = await group({ discussion: 120, vote: 120 });
  const send = (i, type, phase, extra = {}) =>
    api(tokens[i], { code, round: g.round, type, phase, ...extra });
  for (let i = 0; i < 4; i++)
    await send(i, 'action', 'selection', {
      room: 'Tower',
      action: 'Count Coins',
    });
  for (let i = 0; i < 4; i++) await send(i, 'ack', 'results');
  for (let i = 0; i < 4; i++)
    await send(i, 'claim', 'discussion', {
      room: 'Tower',
      action: 'Count Coins',
      result: 'Story',
      statement: '',
    });
  await send(0, 'discussion-ready', 'discussion', { ready: true });
  await send(0, 'discussion-ready', 'discussion', { ready: false });
  let state = await send(1, 'sync', 'discussion');
  assert.equal(state.players.filter((p) => p.discussionReady).length, 0);
  for (let i = 0; i < 4; i++)
    state = await send(i, 'discussion-ready', 'discussion', { ready: true });
  assert.equal(state.phase, 'vote');
  await send(0, 'vote-intent', 'vote', { target: 'skip' });
  const candidate = state.players[1].id;
  await send(0, 'vote-intent', 'vote', { target: candidate });
  await send(2, 'vote-intent', 'vote', { target: candidate });
  state = await send(1, 'sync', 'vote');
  assert.deepEqual(state.liveVotes[candidate], { tentative: 2, locked: 0 });
  assert.equal(state.me.voteTarget, undefined);
  await send(0, 'vote', 'vote', { target: candidate });
  state = await send(0, 'sync', 'vote');
  assert.equal(state.me.voteTarget, candidate);
  assert.deepEqual(state.liveVotes[candidate], { tentative: 1, locked: 1 });
  await api(
    tokens[0],
    {
      type: 'vote-intent',
      code,
      round: g.round,
      phase: 'vote',
      target: 'skip',
    },
    false,
  );
  await api(
    tokens[1],
    { type: 'vote-intent', code, round: 0, phase: 'vote', target: 'skip' },
    false,
  );
  for (let i = 1; i < 4; i++)
    state = await send(i, 'vote', 'vote', { target: 'skip' });
  assert.equal(state.phase, 'verdict');
  assert.equal(state.verdict.totals.skip, 3);
});
