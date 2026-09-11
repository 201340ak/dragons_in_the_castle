import { env } from 'cloudflare:workers';
import { type Game, ensure, GameError, settings } from './engine';
export const db = () => (env as unknown as { DB: D1Database }).DB;
export async function mutate(code: string, change: (g: Game) => void) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const row = await db()
      .prepare('SELECT state, version FROM sessions WHERE code = ?')
      .bind(code)
      .first<{ state: string; version: number }>();
    ensure(row, 'Castle not found. Check your session code.');
    const g: Game = JSON.parse(row.state);
    g.settings = settings(g.settings);
    change(g);
    g.revision = row.version + 1;
    const result = await db()
      .prepare(
        'UPDATE sessions SET state = ?, version = version + 1, updated = ? WHERE code = ? AND version = ?',
      )
      .bind(JSON.stringify(g), Date.now(), code, row.version)
      .run();
    if (result.meta.changes === 1) return g;
  }
  throw new GameError('The castle is busy. Please try again.');
}
