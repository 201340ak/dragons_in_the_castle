import {
  GameError,
  command,
  create,
  ensure,
  join,
  tick,
  view,
} from '@/lib/engine';
import { db, mutate } from '@/lib/store';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      Vary: 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    },
  });
async function identity(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  ensure(
    token && /^[a-f0-9]{64}$/.test(token),
    'Your guest identity is missing. Reload to reconnect.',
  );
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
}
function allowed(req: Request) {
  const origin = req.headers.get('origin');
  const extra = (
    (env as unknown as { ALLOWED_ORIGINS?: string }).ALLOWED_ORIGINS || ''
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    !origin || origin === new URL(req.url).origin || extra.includes(origin)
  );
}
export async function OPTIONS(req: Request) {
  if (!allowed(req)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':
        req.headers.get('origin') || new URL(req.url).origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  });
}
export async function POST(req: Request) {
  const response = await handle(req);
  if (allowed(req) && req.headers.get('origin'))
    response.headers.set(
      'Access-Control-Allow-Origin',
      req.headers.get('origin')!,
    );
  response.headers.set('Vary', 'Authorization, Origin');
  return response;
}
async function handle(req: Request) {
  try {
    ensure(allowed(req), 'Cross-origin requests are not allowed.');
    ensure(
      Number(req.headers.get('content-length') || 0) < 8192,
      'Request too large.',
    );
    const raw = await req.text();
    ensure(raw.length < 8192, 'Request too large.');
    const b = JSON.parse(raw);
    const id = await identity(req);
    const now = Date.now();
    if (b.type === 'create') {
      const recent = await db()
        .prepare(
          "SELECT COUNT(*) AS n FROM sessions WHERE updated > ? AND json_extract(state, '$.host') = ?",
        )
        .bind(now - 3600000, id)
        .first<{ n: number }>();
      ensure(
        (recent?.n || 0) < 10,
        'Rejoin an existing castle or try creating again in an hour.',
      );
      for (let i = 0; i < 5; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = Array.from(
          bytes,
          (n) => alphabet[n % alphabet.length],
        ).join('');
        const g = create(
          code,
          id,
          b.name,
          b.settings || {},
          now,
          b.demo === true,
          b.avatar,
        );
        const result = await db()
          .prepare(
            'INSERT OR IGNORE INTO sessions (code,state,version,updated) VALUES (?,?,0,?)',
          )
          .bind(code, JSON.stringify(g), now)
          .run();
        if (result.meta.changes) return json(view(g, id, now));
      }
      throw new GameError('Could not reserve a code. Please try again.');
    }
    ensure(
      typeof b.code === 'string' && /^[A-Z2-9]{6}$/.test(b.code),
      'Enter a six-character session code.',
    );
    const g = await mutate(b.code, (g) => {
      if (b.type === 'join') join(g, id, b.name, now, b.avatar);
      else {
        ensure(
          g.players.some((p) => p.id === id),
          'You are not a member of this session.',
        );
        tick(g, now);
        if (b.type !== 'sync') {
          if (['action', 'vote', 'claim', 'ack'].includes(b.type))
            ensure(
              b.round === g.round && b.phase === g.phase,
              'The phase changed. Please try again.',
            );
          command(
            g,
            id,
            b,
            now,
            () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
          );
        } else g.players.find((p) => p.id === id)!.seen = now;
      }
      tick(g, now);
    });
    return json(view(g, id, now));
  } catch (e) {
    return json(
      {
        error:
          e instanceof GameError
            ? e.message
            : 'The castle is temporarily unavailable. Please try again.',
      },
      e instanceof GameError ? 400 : 500,
    );
  }
}
