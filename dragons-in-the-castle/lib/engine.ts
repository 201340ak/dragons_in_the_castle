export const ROOMS = ['Treasury', 'Library', 'Great Hall', 'Dungeon', 'Tower'];
export const ACTIONS = [
  'Count Coins',
  'Guard Room',
  'Investigate',
  'Steal Coins',
] as const;
export type Action = (typeof ACTIONS)[number];
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
  ready: boolean;
  active: boolean;
  bot: boolean;
  role?: 'Wizard' | 'Dragon';
  seen: number;
};
export type Settings = {
  coins: number;
  steal: number;
  selection: number;
  discussion: number;
  vote: number;
  dragons: number[];
  reveal: boolean;
  clue: boolean;
  rooms: string[];
};
export type Choice = { room: string; action: Action };
export type Result = {
  room: string;
  action: Action;
  others: number;
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
  votes: Record<string, string>;
  totals: Record<string, number>;
  banished?: string;
  coins: Record<string, number>;
};
export type Game = {
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
export const defaults: Settings = {
  coins: 10,
  steal: 2,
  selection: 60,
  discussion: 90,
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
    Array.isArray(s.dragons) &&
      s.dragons.length === 3 &&
      s.dragons.every(
        (n, i) => Number.isInteger(n) && n >= 1 && n <= [1, 3, 4][i],
      ),
    'Dragons must remain a minority in every player band.',
  );
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
    typeof s.clue === 'boolean' && typeof s.reveal === 'boolean',
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
  join(g, id, name, now);
  if (demo)
    ['Elowen', 'Bramble', 'Rowan', 'Mira', 'Aldric'].forEach((name, i) => {
      join(g, `bot-${i}`, name, now);
      g.players.at(-1)!.bot = true;
      g.players.at(-1)!.ready = true;
    });
  return g;
}
export function join(g: Game, id: string, name: string, now: number) {
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
  g.players.push({
    id,
    name: name.trim(),
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
  g.deadline = now + seconds * 1000;
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
export function resolve(g: Game, now: number) {
  const r = current(g);
  for (const room of g.settings.rooms) {
    const entries = Object.entries(r.choices).filter(
      ([, c]) => c.room === room,
    );
    const guarded = entries.some(([, c]) => c.action === 'Guard Room');
    const attempted = entries.some(([, c]) => c.action === 'Steal Coins');
    for (const [id, c] of entries) {
      const out: Result = {
        room,
        action: c.action,
        others: entries.length - 1,
      };
      if (c.action === 'Steal Coins') {
        out.stolen = guarded ? 0 : Math.min(g.settings.steal, g.rooms[room]);
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
        r.choices[p.id] = {
          room,
          action: p.role === 'Dragon' ? 'Steal Coins' : 'Count Coins',
        };
      }
  if (g.phase === 'discussion')
    for (const p of active(g).filter((p) => p.bot))
      if (!r.claims[p.id])
        r.claims[p.id] = {
          room: r.choices[p.id]?.room || g.settings.rooms[0],
          action: 'Count Coins',
          result: 'I checked the room. Nothing suspicious to report.',
          statement: 'Who else was there?',
        };
  if (g.phase === 'vote')
    for (const p of active(g).filter((p) => p.bot))
      if (!r.votes[p.id])
        r.votes[p.id] = active(g)[g.round % active(g).length]?.id || 'skip';
  const expired = now >= g.deadline;
  if (
    g.phase === 'reveal' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    nextRound(g, now);
  else if (
    g.phase === 'selection' &&
    (expired || active(g).every((p) => r.choices[p.id]))
  )
    resolve(g, now);
  else if (
    g.phase === 'results' &&
    (expired || active(g).every((p) => p.bot || g.ack.includes(p.id)))
  )
    phase(g, 'discussion', now, g.settings.discussion);
  else if (g.phase === 'discussion' && expired)
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
export function command(
  g: Game,
  id: string,
  body: {
    type: string;
    settings?: Partial<Settings>;
    room?: string;
    action?: Action;
    result?: string;
    statement?: string;
    target?: string;
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
      const count =
        g.settings.dragons[
          g.players.length <= 6 ? 0 : g.players.length <= 9 ? 1 : 2
        ];
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
      r.choices[id] = { room: body.room, action: body.action };
      break;
    case 'claim':
      playing();
      ensure(
        g.phase === 'discussion' && now < g.deadline,
        'Discussion has ended.',
      );
      ensure(
        body.room &&
          body.action &&
          g.settings.rooms.includes(body.room) &&
          ACTIONS.slice(0, 3).includes(body.action),
        'Choose a room and a public action.',
      );
      ensure(
        typeof body.result === 'string' &&
          body.result.length <= 240 &&
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
      ensure(g.demo, 'Only available in a simulated game.');
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
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      active: p.active,
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
      result: g.phase !== 'selection' ? r?.results[id] : undefined,
      voted: !!r?.votes[id],
    },
    claims: ['discussion', 'vote', 'verdict', 'over'].includes(g.phase)
      ? r?.claims || {}
      : {},
    verdict: ['verdict', 'over'].includes(g.phase)
      ? { totals: r?.totals || {}, banished: r?.banished }
      : undefined,
    ...(g.phase === 'over' ? { history: g.history, coins: g.rooms } : {}),
  };
}
export type View = ReturnType<typeof view>;
