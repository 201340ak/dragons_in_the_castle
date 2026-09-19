export const ROOMS = ['Treasury', 'Library', 'Great Hall', 'Dungeon', 'Tower'];
export const ACTIONS = [
  'Count Coins',
  'Guard Room',
  'Investigate',
  'Steal Coins',
] as const;
export type Action = (typeof ACTIONS)[number];
export const REACTIONS = [
  { id: 'skeptical', emoji: '🤔', label: 'Skeptical' },
  { id: 'interesting', emoji: '👀', label: 'Interesting' },
  { id: 'believable', emoji: '👍', label: 'Believable' },
  { id: 'funny', emoji: '😂', label: 'Funny' },
] as const;
export type Reaction = (typeof REACTIONS)[number]['id'];
export type Phase =
  | 'lobby'
  | 'reveal'
  | 'selection'
  | 'results'
  | 'discussion'
  | 'vote'
  | 'verdict'
  | 'over';
export type Player = {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  active: boolean;
  bot: boolean;
  role?: 'Wizard' | 'Dragon';
  seen: number;
};
export const PLAYER_NAMES = [
  'Alina',
  'Aldric',
  'Bramble',
  'Cedric',
  'Elowen',
  'Fable',
  'Juniper',
  'Mira',
  'Nim',
  'Orin',
  'Pip',
  'Rowan',
  'Tamsin',
  'Thalia',
  'Wren',
  'Zander',
] as const;
export const PLAYER_AVATARS = [
  '🧙',
  '🛡️',
  '🏹',
  '🗝️',
  '📜',
  '🦉',
  '⚔️',
  '🧭',
] as const;
export type Settings = {
  gameMode: 'steal-the-treasure';
  showRoomAttendance: boolean;
  coins: number;
  steal: number;
  stealMin: number;
  stealMax: number;
  selection: number;
  discussion: number;
  roundTableUntimed: boolean;
  roundTableHostAdvance: boolean;
  vote: number;
  dragons: number[];
  reveal: boolean;
  clue: boolean;
  rooms: string[];
};
export type Choice = { room: string; action: Action; amount?: number };
export type Result = {
  room: string;
  action: Action;
  others?: number;
  coins?: number;
  blocked?: boolean;
  stolen?: number;
  groups?: Record<string, number>;
};
export type Claim = {
  room: string;
  action: string;
  result: string;
  statement: string;
};
export type Round = {
  number: number;
  choices: Record<string, Choice>;
  results: Record<string, Result>;
  claims: Record<string, Claim>;
  claimVersions?: Record<string, number>;
  reactions?: Record<string, Record<string, Reaction>>;
  votes: Record<string, string>;
  voteIntents?: Record<string, string>;
  totals: Record<string, number>;
  banished?: string;
  coins: Record<string, number>;
};
export type Game = {
  revision?: number;
  code: string;
  host: string;
  players: Player[];
  settings: Settings;
  phase: Phase;
  deadline: number;
  round: number;
  rooms: Record<string, number>;
  history: Round[];
  ack: string[];
  winner?: string;
  demo: boolean;
  events: { at: number; text: string }[];
};
const BOT_NAMES = PLAYER_NAMES;
export const defaults: Settings = {
  gameMode: 'steal-the-treasure',
  showRoomAttendance: false,
  coins: 10,
  steal: 2,
  stealMin: 1,
  stealMax: 3,
  selection: 60,
  discussion: 90,
  roundTableUntimed: false,
  roundTableHostAdvance: false,
  vote: 45,
  dragons: [1, 2, 3],
  reveal: false,
  clue: true,
  rooms: ROOMS,
};
export class GameError extends Error {}
export function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new GameError(message);
}
export function settings(input: Partial<Settings> = {}): Settings {
  const s = { ...defaults, ...input };
  ensure(
    s.gameMode === 'steal-the-treasure',
    'That game mode is not available yet.',
  );
  ensure(
    typeof s.showRoomAttendance === 'boolean',
    'Choose whether to show room attendance.',
  );
  // Legacy saved games and older clients supplied a single theft amount.
  if (
    input.stealMin === undefined &&
    input.stealMax === undefined &&
    input.steal !== undefined
  ) {
    s.stealMin = s.stealMax = Math.min(input.steal, s.coins);
  }
  if (
    input.stealMin === undefined &&
    input.stealMax === undefined &&
    input.steal === undefined
  ) {
    s.stealMax = Math.min(s.stealMax, s.coins);
  }
  for (const k of [
    'coins',
    'steal',
    'selection',
    'discussion',
    'vote',
  ] as const)
    ensure(
      Number.isInteger(s[k]) &&
        s[k] >= 1 &&
        s[k] <= (k === 'coins' ? 100 : k === 'steal' ? 10 : 600),
      'Choose valid coin amounts and timers (1–600 seconds).',
    );
  ensure(
    Number.isInteger(s.stealMin) &&
      Number.isInteger(s.stealMax) &&
      s.stealMin >= 1 &&
      s.stealMin <= s.stealMax &&
      s.stealMax <= s.coins,
    'Theft range must be between 1 and the starting coins per room.',
  );
  s.dragons = [1, 2, 3];
  ensure(
    Array.isArray(s.rooms) &&
      s.rooms.length >= 1 &&
      s.rooms.length <= 8 &&
      s.rooms.every(
        (r) => typeof r === 'string' && r.trim().length > 0 && r.length <= 24,
      ) &&
      new Set(s.rooms).size === s.rooms.length,
    'Use 1–8 unique room names.',
  );
  ensure(
    typeof s.clue === 'boolean' &&
      typeof s.reveal === 'boolean' &&
      typeof s.roundTableUntimed === 'boolean' &&
      typeof s.roundTableHostAdvance === 'boolean',
    'Invalid settings.',
  );
  return s;
}
export function create(
  code: string,
  id: string,
  name: string,
  input: Partial<Settings>,
  now: number,
  demo = false,
  avatar?: string,
): Game {
  const g: Game = {
    code,
    host: id,
    players: [],
    settings: settings(input),
    phase: 'lobby',
    deadline: 0,
    round: 0,
    rooms: {},
    history: [],
    ack: [],
    demo,
    events: [],
  };
  join(g, id, name, now, avatar);
  if (demo) for (let i = 0; i < 5; i++) addBot(g, id, now);
  return g;
}
export function addBot(g: Game, hostId: string, now: number) {
  ensure(g.host === hostId, 'Only the host can add bots.');
  ensure(g.phase === 'lobby', 'Bots can only be changed in the lobby.');
  ensure(g.players.length < 12, 'This castle is full.');
  const used = new Set(g.players.map((p) => p.name.toLowerCase()));
  const name = BOT_NAMES.find(
    (candidate) => !used.has(candidate.toLowerCase()),
  );
  ensure(name, 'No more bot names are available.');
  let number = 0;
  while (g.players.some((p) => p.id === `bot-${number}`)) number++;
  g.players.push({
    id: `bot-${number}`,
    name,
    avatar: PLAYER_AVATARS[number % PLAYER_AVATARS.length],
    ready: true,
    active: true,
    bot: true,
    seen: now,
  });
}
export function removeBot(g: Game, hostId: string, botId: string) {
  ensure(g.host === hostId, 'Only the host can remove bots.');
  ensure(g.phase === 'lobby', 'Bots can only be changed in the lobby.');
  const index = g.players.findIndex((p) => p.id === botId && p.bot);
  ensure(index >= 0, 'Choose a bot to remove.');
  g.players.splice(index, 1);
}
export function join(
  g: Game,
  id: string,
  name: string,
  now: number,
  avatar?: string,
) {
  const p = g.players.find((p) => p.id === id);
  if (p) {
    p.seen = now;
    return;
  }
  ensure(g.phase === 'lobby', 'This game has already started.');
  ensure(g.players.length < 12, 'This castle is full.');
  ensure(
    typeof name === 'string' &&
      name.trim().length >= 2 &&
      name.trim().length <= 20,
    'Use a name between 2 and 20 characters.',
  );
  ensure(
    !g.players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase()),
    'That name is already taken.',
  );
  ensure(
    avatar === undefined || PLAYER_AVATARS.includes(avatar as never),
    'Choose a valid avatar.',
  );
  g.players.push({
    id,
    name: name.trim(),
    avatar: avatar || PLAYER_AVATARS[g.players.length % PLAYER_AVATARS.length],
    ready: false,
    active: true,
    bot: false,
    seen: now,
  });
}
const active = (g: Game) => g.players.filter((p) => p.active);
const current = (g: Game) => g.history[g.history.length - 1];
function phase(g: Game, p: Phase, now: number, seconds: number) {
  g.phase = p;
  // Zero is the serializable no-deadline sentinel only for an untimed Round table.
  g.deadline =
    p === 'discussion' && g.settings.roundTableUntimed
      ? 0
      : now + seconds * 1000;
  g.ack = [];
}
function nextRound(g: Game, now: number) {
  g.round++;
  g.history.push({
    number: g.round,
    choices: {},
    results: {},
    claims: {},
    votes: {},
    totals: {},
    coins: {},
  });
  phase(g, 'selection', now, g.settings.selection);
}
function win(g: Game) {
  if (Object.values(g.rooms).every((n) => n === 0)) g.winner = 'Dragons';
  else if (!active(g).some((p) => p.role === 'Dragon')) g.winner = 'Wizards';
  if (g.winner) g.phase = 'over';
}
export function theftBounds(g: Game, room: string) {
  const min =
    g.settings.stealMin ?? Math.min(g.settings.steal, g.settings.coins);
  const max = g.settings.stealMax ?? min;
  return {
    min: Math.min(min, g.rooms[room]),
    max: Math.min(max, g.rooms[room]),
  };
}
export function resolve(
  g: Game,
  now: number,
  random: () => number = () =>
    crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
) {
  ensure(g.phase === 'selection', 'This round has already resolved.');
  const r = current(g);
  for (const room of g.settings.rooms) {
    const entries = Object.entries(r.choices).filter(
      ([, c]) => c.room === room,
    );
    // Shuffle at resolution, never award scarce coins by submission order.
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    const guarded = entries.some(([, c]) => c.action === 'Guard Room');
    const attempted = entries.some(([, c]) => c.action === 'Steal Coins');
    for (const [id, c] of entries) {
      const out: Result = {
        room,
        action: c.action,
        ...(g.settings.showRoomAttendance
          ? { others: entries.length - 1 }
          : {}),
      };
      if (c.action === 'Steal Coins') {
        out.stolen = guarded
          ? 0
          : Math.min(c.amount ?? g.settings.steal, g.rooms[room]);
        g.rooms[room] -= out.stolen;
        out.blocked = guarded;
      }
      r.results[id] = out;
    }
    for (const [id, c] of entries) {
      const out = r.results[id];
      if (c.action === 'Count Coins') out.coins = g.rooms[room];
      if (c.action === 'Guard Room') out.blocked = guarded && attempted;
      if (c.action === 'Investigate' && g.settings.clue)
        out.groups = {
          protective: entries.filter(([, c]) => c.action === 'Guard Room')
            .length,
          informational: entries.filter(
            ([, c]) => c.action === 'Count Coins' || c.action === 'Investigate',
          ).length,
          unknown: entries.filter(([, c]) => c.action === 'Steal Coins').length,
        };
    }
  }
  r.coins = { ...g.rooms };
  phase(g, 'results', now, 20);
  win(g);
}
export function tally(g: Game, now: number) {
  const r = current(g);
  r.totals = {};
  for (const v of Object.values(r.votes)) r.totals[v] = (r.totals[v] || 0) + 1;
  const candidate = Object.entries(r.totals).find(
    ([id, n]) => id !== 'skip' && n > active(g).length / 2,
  );
  if (candidate) {
    r.banished = candidate[0];
    g.players.find((p) => p.id === candidate[0])!.active = false;
  }
  phase(g, 'verdict', now, 12);
  win(g);
}
export function tick(g: Game, now: number) {
  if (g.phase === 'lobby' || g.phase === 'over') return;
  const r = current(g);
  if (g.phase === 'selection')
    for (const p of active(g).filter((p) => p.bot))
      if (!r.choices[p.id]) {
        const index =
          (g.round + g.players.indexOf(p)) % g.settings.rooms.length;
        const room =
          p.role === 'Dragon'
            ? Object.keys(g.rooms).find((r) => g.rooms[r] > 0) ||
              g.settings.rooms[0]
            : g.settings.rooms[index];
        const style = (g.round + g.players.indexOf(p)) % 4;
        r.choices[p.id] = {
          room,
          amount: theftBounds(g, room).max,
          action:
            p.role === 'Dragon'
              ? style === 0
                ? 'Investigate'
                : 'Steal Coins'
              : (['Count Coins', 'Guard Room', 'Investigate', 'Guard Room'][
                  style
                ] as Action),
        };
      }
  if (g.phase === 'discussion')
    for (const p of active(g).filter((p) => p.bot))
      if (!r.claims[p.id]) {
        const choice = r.choices[p.id];
        const result = r.results[p.id];
        const truthful = p.role === 'Wizard' && choice && result;
        r.claims[p.id] = {
          room: choice?.room || g.settings.rooms[0],
          action: truthful ? choice.action : 'Count Coins',
          result: truthful
            ? botResult(privateResult(result, g.settings.showRoomAttendance))
            : 'I counted the coins. Nothing seemed out of place.',
          statement: '',
        };
      }
  if (g.phase === 'vote')
    for (const p of active(g).filter((p) => p.bot))
      if (!r.votes[p.id]) {
        const candidates = active(g).filter(
          (candidate) => candidate.id !== p.id,
        );
        r.votes[p.id] =
          (g.round + g.players.indexOf(p)) % 4 === 0
            ? 'skip'
            : candidates[(g.round + g.players.indexOf(p)) % candidates.length]
                ?.id || 'skip';
      }
  const expired =
    !(g.phase === 'discussion' && g.settings.roundTableUntimed) &&
    now >= g.deadline;
  if (
    g.phase === 'reveal' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    nextRound(g, now);
  else if (g.phase === 'selection' && selectionComplete(g, now))
    resolve(g, now);
  else if (
    g.phase === 'results' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    phase(g, 'discussion', now, g.settings.discussion);
  else if (
    g.phase === 'discussion' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    phase(g, 'vote', now, g.settings.vote);
  else if (
    g.phase === 'vote' &&
    (expired || active(g).every((p) => r.votes[p.id]))
  )
    tally(g, now);
  else if (
    g.phase === 'verdict' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    nextRound(g, now);
}
function privateResult(result: Result, showAttendance = false): Result {
  if (showAttendance) return result;
  const { others: _others, ...privateFields } = result;
  return privateFields;
}
function botResult(r: Result) {
  const company =
    r.others === undefined
      ? ''
      : `${r.others} other ${r.others === 1 ? 'player was' : 'players were'} there.`;
  if (r.coins !== undefined) return `${r.coins} coins remained. ${company}`;
  if (r.action === 'Guard Room')
    return `${r.blocked ? 'I stopped a theft.' : 'No theft was attempted.'} ${company}`;
  if (r.groups)
    return `I found ${r.groups.protective} protective, ${r.groups.informational} informational, and ${r.groups.unknown} unknown actions. ${company}`;
  return company;
}
function roundTableOpen(g: Game, now: number) {
  return (
    g.phase === 'discussion' &&
    (g.settings.roundTableUntimed || now < g.deadline)
  );
}
export function command(
  g: Game,
  id: string,
  body: {
    type: string;
    settings?: Partial<Settings>;
    room?: string;
    action?: Action;
    amount?: number;
    result?: string;
    statement?: string;
    target?: string;
    ready?: boolean;
    reaction?: Reaction | null;
    claimVersion?: number;
  },
  now: number,
  random: () => number = Math.random,
) {
  const p = g.players.find((p) => p.id === id);
  ensure(p, 'You are not a member of this session.');
  p.seen = now;
  const host = () => ensure(g.host === id, 'Only the host can do that.');
  const playing = () =>
    ensure(p.active, 'Spectators cannot act, claim, or vote.');
  const r = current(g);
  switch (body.type) {
    case 'ready':
      ensure(g.phase === 'lobby', 'The lobby is closed.');
      p.ready = !p.ready;
      break;
    case 'settings':
      host();
      ensure(g.phase === 'lobby', 'Settings are locked during play.');
      g.settings = settings(body.settings);
      break;
    case 'add-bot':
      addBot(g, id, now);
      break;
    case 'remove-bot':
      ensure(typeof body.target === 'string', 'Choose a bot to remove.');
      removeBot(g, id, body.target);
      break;
    case 'start': {
      host();
      ensure(g.phase === 'lobby', 'Game already started.');
      ensure(
        g.players.length >= 4 && g.players.every((p) => p.ready),
        'At least 4 players must all be ready.',
      );
      const order = [...g.players];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const count = g.players.length <= 6 ? 1 : g.players.length <= 9 ? 2 : 3;
      order.forEach((p, i) => {
        p.role = i < count ? 'Dragon' : 'Wizard';
        p.active = true;
      });
      g.rooms = Object.fromEntries(
        g.settings.rooms.map((r) => [r, g.settings.coins]),
      );
      phase(g, 'reveal', now, 30);
      break;
    }
    case 'action':
      playing();
      ensure(
        g.phase === 'selection' && now < g.deadline,
        'The selection phase has ended.',
      );
      ensure(!r.choices[id], 'Your choice is already sealed.');
      ensure(
        body.room &&
          body.action &&
          g.settings.rooms.includes(body.room) &&
          ACTIONS.includes(body.action),
        'Choose a valid room and action.',
      );
      ensure(
        body.action !== 'Steal Coins' || p.role === 'Dragon',
        'Wizards cannot steal.',
      );
      if (body.action === 'Steal Coins') {
        const bounds = theftBounds(g, body.room);
        const amount =
          body.amount ??
          Math.max(bounds.min, Math.min(g.settings.steal, bounds.max));
        ensure(
          Number.isInteger(amount) &&
            amount >= bounds.min &&
            amount <= bounds.max,
          'Choose a valid number of coins to steal.',
        );
        r.choices[id] = { room: body.room, action: body.action, amount };
      } else r.choices[id] = { room: body.room, action: body.action };
      break;
    case 'claim':
      playing();
      ensure(roundTableOpen(g, now), 'The Round table has ended.');
      ensure(
        body.room &&
          body.action &&
          g.settings.rooms.includes(body.room) &&
          ACTIONS.slice(0, 3).includes(body.action),
        'Choose a room and a public action.',
      );
      ensure(
        typeof body.result === 'string' &&
          body.result.length <= 640 &&
          typeof body.statement === 'string' &&
          body.statement.length <= 400,
        'Keep your claim brief.',
      );
      r.claims[id] = {
        room: body.room,
        action: body.action,
        result: body.result,
        statement: body.statement,
      };
      (r.claimVersions ??= {})[id] = (r.claimVersions?.[id] ?? 0) + 1;
      if (r.reactions) delete r.reactions[id];
      g.ack = g.ack.filter((playerId) => playerId !== id);
      break;
    case 'claim-reaction': {
      playing();
      ensure(roundTableOpen(g, now), 'The Round table has ended.');
      const target = body.target;
      ensure(
        target &&
          target !== id &&
          g.players.some((player) => player.id === target) &&
          r.claims[target],
        'Choose another player’s posted claim.',
      );
      ensure(
        body.claimVersion === (r.claimVersions?.[target] ?? 0),
        'That claim changed. Read it again before reacting.',
      );
      ensure(
        body.reaction === null ||
          REACTIONS.some((reaction) => reaction.id === body.reaction),
        'Choose an available reaction.',
      );
      const reactions = (r.reactions ??= {});
      const claimReactions = (reactions[target] ??= {});
      if (body.reaction === null) delete claimReactions[id];
      else claimReactions[id] = body.reaction!;
      break;
    }
    case 'discussion-ready':
      playing();
      ensure(roundTableOpen(g, now), 'The Round table has ended.');
      ensure(r.claims[id], 'Post a claim before getting ready to vote.');
      ensure(typeof body.ready === 'boolean', 'Choose your readiness.');
      g.ack = g.ack.filter((playerId) => playerId !== id);
      if (body.ready) g.ack.push(id);
      break;
    case 'round-table-advance':
      host();
      ensure(
        g.phase === 'discussion' &&
          g.settings.roundTableUntimed &&
          g.settings.roundTableHostAdvance,
        'Host advancement is not enabled for this Round table.',
      );
      phase(g, 'vote', now, g.settings.vote);
      break;
    case 'vote-intent':
      playing();
      ensure(g.phase === 'vote' && now < g.deadline, 'Voting has ended.');
      ensure(!r.votes[id], 'Your vote is already sealed.');
      ensure(
        body.target === 'skip' ||
          active(g).some((candidate) => candidate.id === body.target),
        'Choose an active player or Skip.',
      );
      (r.voteIntents ??= {})[id] = body.target!;
      break;
    case 'vote':
      playing();
      ensure(g.phase === 'vote' && now < g.deadline, 'Voting has ended.');
      ensure(!r.votes[id], 'Your vote is already sealed.');
      ensure(
        body.target &&
          (body.target === 'skip' ||
            active(g).some((p) => p.id === body.target)),
        'Choose an active player or Skip.',
      );
      r.votes[id] = body.target;
      if (r.voteIntents) delete r.voteIntents[id];
      break;
    case 'ack':
      playing();
      ensure(
        ['reveal', 'results', 'verdict'].includes(g.phase),
        'There is nothing to continue yet.',
      );
      if (!g.ack.includes(id)) g.ack.push(id);
      break;
    case 'demo-next':
      host();
      ensure(g.demo, 'Only available in a bot game.');
      ensure(
        !(g.phase === 'discussion' && g.settings.roundTableUntimed),
        'Use Round table readiness or its configured host advancement.',
      );
      g.deadline = now;
      break;
    case 'again':
      host();
      ensure(g.phase === 'over', 'Finish this game first.');
      g.phase = 'lobby';
      g.winner = undefined;
      g.round = 0;
      g.history = [];
      g.rooms = {};
      g.ack = [];
      g.players.forEach((p) => {
        delete p.role;
        p.active = true;
        p.ready = p.bot;
      });
      break;
    default:
      throw new GameError('Unknown request.');
  }
  g.events.push({ at: now, text: body.type });
  if (g.events.length > 2000) g.events.shift();
  tick(g, now);
}
export function view(g: Game, id: string, now: number) {
  const me = g.players.find((p) => p.id === id);
  ensure(me, 'You are not a member of this session.');
  const r = current(g);
  return {
    revision: g.revision ?? 0,
    code: g.code,
    host: g.host,
    settings: g.settings,
    phase: g.phase,
    deadline: g.deadline,
    serverTime: now,
    round: g.round,
    demo: g.demo,
    winner: g.winner,
    ack: g.ack.includes(id),
    players: g.players.map((p, index) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar || PLAYER_AVATARS[index % PLAYER_AVATARS.length],
      ready: p.ready,
      active: p.active,
      discussionReady:
        g.phase === 'discussion' && p.active && (p.bot || g.ack.includes(p.id)),
      online: p.bot || now - p.seen < 15000,
      bot: p.bot,
      submitted: g.phase === 'vote' ? !!r?.votes[p.id] : !!r?.choices[p.id],
      ...(g.phase === 'over' || (!p.active && g.settings.reveal)
        ? { role: p.role }
        : {}),
    })),
    me: {
      id: me.id,
      role: me.role,
      active: me.active,
      allies:
        me.role === 'Dragon'
          ? g.players
              .filter((p) => p.role === 'Dragon' && p.id !== id)
              .map((p) => p.name)
          : [],
      choice: r?.choices[id],
      theftBounds:
        me.active && me.role === 'Dragon' && g.phase === 'selection'
          ? Object.fromEntries(
              g.settings.rooms.map((room) => [room, theftBounds(g, room)]),
            )
          : undefined,
      result:
        g.phase !== 'selection' && r?.results[id]
          ? privateResult(r.results[id], g.settings.showRoomAttendance)
          : undefined,
      voted: !!r?.votes[id],
      voteTarget:
        g.phase === 'vote' ? r?.votes[id] || r?.voteIntents?.[id] : undefined,
    },
    claims: ['discussion', 'vote', 'verdict', 'over'].includes(g.phase)
      ? r?.claims || {}
      : {},
    claimReactions: ['discussion', 'vote', 'verdict', 'over'].includes(g.phase)
      ? Object.fromEntries(
          Object.keys(r?.claims || {}).map((target) => [
            target,
            {
              version: r?.claimVersions?.[target] ?? 0,
              mine: r?.reactions?.[target]?.[id] ?? null,
              counts: Object.fromEntries(
                REACTIONS.map(({ id: reaction }) => [
                  reaction,
                  Object.values(r?.reactions?.[target] || {}).filter(
                    (value) => value === reaction,
                  ).length,
                ]),
              ),
            },
          ]),
        )
      : {},
    liveVotes:
      g.phase === 'vote'
        ? Object.fromEntries(
            [...active(g).map((p) => p.id), 'skip'].map((target) => [
              target,
              {
                tentative: active(g).filter(
                  (p) => !r.votes[p.id] && r.voteIntents?.[p.id] === target,
                ).length,
                locked: active(g).filter((p) => r.votes[p.id] === target)
                  .length,
              },
            ]),
          )
        : undefined,
    verdict: ['verdict', 'over'].includes(g.phase)
      ? { totals: r?.totals || {}, banished: r?.banished }
      : undefined,
    ...(g.phase === 'over'
      ? {
          history: g.history.map(({ reactions: _reactions, ...round }) => ({
            ...round,
            results: Object.fromEntries(
              Object.entries(round.results).map(([playerId, result]) => [
                playerId,
                privateResult(result, g.settings.showRoomAttendance),
              ]),
            ),
          })),
          coins: g.rooms,
        }
      : {}),
  };
}
export function selectionComplete(g: Game, now: number) {
  return (
    g.phase === 'selection' &&
    (now >= g.deadline || active(g).every((p) => !!current(g).choices[p.id]))
  );
}
export type View = ReturnType<typeof view>;
