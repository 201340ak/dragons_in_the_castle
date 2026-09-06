'use client';
import { useState } from 'react';
import { Copy, Clock3, Crown, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { View } from '@/lib/engine';
import { SettingsForm, type Send } from './shared';
import { Lobby } from './lobby';
const titles: Record<string, string> = {
  lobby: 'Gather your fellowship',
  reveal: 'Your secret identity',
  selection: 'Choose your path',
  results: 'Behind closed doors',
  discussion: 'Time to talk',
  vote: 'The castle decides',
  verdict: 'The verdict is in',
  over: 'The truth comes to light',
};
export function Session({
  game,
  send,
  busy,
  offline,
  now,
  error,
  leave,
  children,
}: {
  game: View;
  send: Send;
  busy: boolean;
  offline: boolean;
  now: number;
  error: string;
  leave: () => void;
  children?: React.ReactNode;
}) {
  const [config, setConfig] = useState(game.settings),
    [copied, setCopied] = useState(false),
    [showRole, setShowRole] = useState(false);
  const host = game.host === game.me.id,
    seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  return (
    <div className="game-shell">
      <div className="session-line">
        <span className="eyebrow gold">
          {game.demo ? 'SIMULATED FELLOWSHIP' : 'YOUR FELLOWSHIP'} · {game.code}
        </span>
        <Button
          className="quiet"
          onClick={() => {
            void navigator.clipboard
              .writeText(game.code)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch(() => {});
          }}
        >
          <Copy />
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>
      <div className="game-title">
        <div>
          <span className="eyebrow">
            {game.phase === 'lobby'
              ? 'THE ADVENTURE AWAITS'
              : `ROUND ${game.round || 1}`}
          </span>
          <h1>{titles[game.phase]}</h1>
        </div>
        {!['lobby', 'over'].includes(game.phase) && (
          <div className="timer" aria-label={`${seconds} seconds remaining`}>
            <Clock3 />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>
      {offline && (
        <div className="error" aria-live="polite">
          Reconnecting to the castle… Your identity is saved. Actions resume
          when the connection returns.
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!['lobby', 'over'].includes(game.phase) && (
        <nav className="phase-track" aria-label="Round phases">
          {[
            ['selection', 'Secret selection'],
            ['results', 'Private results'],
            ['discussion', 'Discussion'],
            ['vote', 'Banishment'],
          ].map(([p, label], i) => (
            <span
              key={p}
              className={
                game.phase === p || (p === 'vote' && game.phase === 'verdict')
                  ? 'current'
                  : ''
              }
            >
              <b>{i + 1}</b>
              {label}
            </span>
          ))}
        </nav>
      )}
      <div className="play-layout">
        <section className="play-main">
          {game.phase === 'lobby' ? (
            <Lobby game={game} send={send} disabled={busy || offline} />
          ) : (
            children || (
              <div className="panel">
                <h2>The castle is ready</h2>
                <p>
                  The next milestone connects the round screens. Your session
                  remains safely stored.
                </p>
              </div>
            )
          )}
        </section>
        <aside className="game-sidebar">
          <div className="dark-panel">
            <span className="eyebrow">CASTLE COMPANY</span>
            <h3>The fellowship</h3>
            {game.players.map((p, i) => (
              <div
                key={p.id}
                className={`roster ${!p.active ? 'banished' : ''}`}
              >
                <span className={`avatar a${i % 4}`}>{p.name[0]}</span>
                <div>
                  <strong>
                    {p.name}
                    {p.id === game.me.id ? ' · you' : ''}
                  </strong>
                  <small>
                    {!p.active
                      ? 'Spectator'
                      : p.id === game.host
                        ? 'Host'
                        : p.bot
                          ? 'Simulated'
                          : p.online
                            ? 'Present'
                            : 'Reconnecting'}
                  </small>
                </div>
                {p.id === game.host ? (
                  <Crown size={16} />
                ) : p.submitted &&
                  ['selection', 'vote'].includes(game.phase) ? (
                  <Check size={17} />
                ) : null}
              </div>
            ))}
          </div>
          {!['lobby', 'over'].includes(game.phase) && (
            <div className="dark-panel">
              <div className="row">
                <span className="eyebrow">YOUR SECRET</span>
                <Button
                  className="quiet"
                  aria-label={showRole ? 'Hide role' : 'Reveal role'}
                  onClick={() => setShowRole(!showRole)}
                >
                  {showRole ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {showRole ? (
                <>
                  <h3 className={game.me.role === 'Dragon' ? 'red' : 'gold'}>
                    {game.me.role}
                  </h3>
                  <p className="muted">
                    {game.me.allies.length
                      ? `Fellow Dragons: ${game.me.allies.join(', ')}`
                      : game.me.role === 'Wizard'
                        ? 'Banish every Dragon to win.'
                        : 'Steal every coin to win.'}
                  </p>
                </>
              ) : (
                <p className="muted">Your identity stays under wraps.</p>
              )}
            </div>
          )}
          <div className="dark-panel">
            <span className="eyebrow">THE CASTLE RULES</span>
            <p className="muted">
              {game.settings.rooms.length} rooms · {game.settings.coins}{' '}
              starting coins each
              <br />
              {game.settings.steal} coins per theft
              <br />
              {game.settings.dragons.join(' / ')} Dragons for 4–6 / 7–9 / 10–12
              players
            </p>
            <p className="muted">
              Guarded rooms stop all theft. Room coin counts stay secret.
            </p>
            {host && game.phase === 'lobby' && (
              <details>
                <summary>Host settings</summary>
                <div className="panel settings-pop">
                  <SettingsForm value={config} onChange={setConfig} />
                  <Button
                    className="primary"
                    disabled={busy || offline}
                    onClick={() => void send('settings', { settings: config })}
                  >
                    Save settings
                  </Button>
                </div>
              </details>
            )}
          </div>
          {host && game.demo && !['lobby', 'over'].includes(game.phase) && (
            <div className="dark-panel">
              <span className="eyebrow">DEMO CONTROLS</span>
              <p className="muted">
                Simulated players act automatically. Move the clock forward to
                explore the next phase.
              </p>
              <Button
                className="quiet full"
                disabled={busy || offline}
                onClick={() => void send('demo-next')}
              >
                Finish this phase
              </Button>
            </div>
          )}
          <Button className="quiet full" onClick={leave}>
            Return home
          </Button>
          <p className="tiny">
            Your guest identity stays on this device. Rejoin with the same code
            to return.
          </p>
        </aside>
      </div>
    </div>
  );
}
