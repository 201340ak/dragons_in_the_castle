'use client';
import { useState } from 'react';
import { Copy, Clock3, Users, LockKeyhole, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { View } from '@/lib/engine';
import { AvatarBadge, SettingsForm, resultText, type Send } from './shared';
import { Lobby } from './lobby';
const titles: Record<string, string> = {
  lobby: 'Lobby',
  reveal: 'Your role',
  selection: 'Choose',
  results: 'Your result',
  discussion: 'Round table',
  vote: 'Vote',
  verdict: 'Verdict',
  over: 'Game over',
};
export function Session({
  game,
  send,
  busy,
  offline,
  now,
  error,
  leave,
  privacyHidden,
  coverScreen,
  children,
}: {
  game: View;
  send: Send;
  busy: boolean;
  offline: boolean;
  now: number;
  error: string;
  leave: () => void;
  privacyHidden: boolean;
  coverScreen: () => void;
  children?: React.ReactNode;
}) {
  const [config, setConfig] = useState(game.settings);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<'players' | 'secret' | 'rules' | null>(
    null,
  );
  const seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const host = game.host === game.me.id;
  return (
    <div className="game-shell">
      <div className="controller-status">
        <Button
          className="quiet room-code"
          aria-label={`Copy room code ${game.code}`}
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
          <Copy size={16} />
          {copied ? 'Copied!' : game.code}
        </Button>
        <span className="controller-name">
          {game.players.find((p) => p.id === game.me.id)?.name}
        </span>
      </div>
      <div className="controller-phase">
        <span>
          {game.phase !== 'lobby' && `Round ${game.round || 1} · `}
          {titles[game.phase]}
          {game.demo && ' · Bot game'}
        </span>
        {!['lobby', 'over'].includes(game.phase) && (
          <span
            className="controller-clock"
            aria-label={`${seconds} seconds remaining`}
          >
            <Clock3 size={16} />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      {offline && (
        <div className="error" aria-live="polite">
          Reconnecting… Your identity is saved.
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="play-main">
        {game.phase === 'lobby' ? (
          <Lobby game={game} send={send} disabled={busy || offline} />
        ) : (
          children
        )}
      </section>
      <nav className="controller-nav" aria-label="Game information">
        <Button
          className="quiet"
          aria-haspopup="dialog"
          onClick={() => setPanel('players')}
        >
          <Users />
          Players <span>{game.players.length}</span>
        </Button>
        <Button
          className="quiet"
          aria-haspopup="dialog"
          disabled={game.phase === 'lobby'}
          onClick={() => setPanel('secret')}
        >
          <LockKeyhole />
          My info
        </Button>
        <Button
          className="quiet"
          aria-haspopup="dialog"
          onClick={() => setPanel('rules')}
        >
          <BookOpen />
          More
        </Button>
      </nav>
      {!privacyHidden && (
        <Sheet
          open={panel !== null}
          onOpenChange={(open) => {
            if (!open) setPanel(null);
          }}
        >
          <SheetContent side="bottom" className="controller-sheet">
            <SheetTitle>
              {panel === 'players'
                ? 'At the table'
                : panel === 'secret'
                  ? 'For your eyes only'
                  : 'Rules & settings'}
            </SheetTitle>
            <SheetDescription>
              {panel === 'players'
                ? 'Everyone in this castle.'
                : panel === 'secret'
                  ? 'Keep this screen to yourself.'
                  : 'A quick refresher, whenever you need it.'}
            </SheetDescription>
            {panel === 'players' &&
              game.players.map((p, i) => (
                <div
                  key={p.id}
                  className={`roster ${!p.active ? 'banished' : ''}`}
                >
                  <AvatarBadge player={p} index={i} />
                  <div>
                    <strong>
                      {p.name}
                      {p.id === game.me.id && ' · you'}
                    </strong>
                    <small>
                      {!p.active
                        ? 'Spectator'
                        : !p.online && !p.bot
                          ? 'Reconnecting'
                          : p.id === game.host
                            ? 'Host'
                            : p.bot
                              ? 'Bot'
                              : 'Playing'}
                    </small>
                  </div>
                  <span className="player-progress">
                    {game.phase === 'lobby'
                      ? p.ready
                        ? 'Ready'
                        : 'Not ready'
                      : ['selection', 'vote'].includes(game.phase) && p.active
                        ? p.submitted
                          ? 'Done'
                          : 'Choosing'
                        : ''}
                  </span>
                </div>
              ))}
            {panel === 'secret' && (
              <>
                <Button
                  className="secondary full"
                  onClick={() => {
                    setPanel(null);
                    coverScreen();
                  }}
                >
                  Hide screen
                </Button>
                <h2>{game.me.role}</h2>
                <p>
                  {game.me.role === 'Wizard'
                    ? 'Banish every Dragon to win.'
                    : 'Steal every coin to win.'}
                </p>
                {game.me.allies.length > 0 && (
                  <p>Fellow Dragons: {game.me.allies.join(', ')}</p>
                )}
                {game.me.result && (
                  <div className="private-note">
                    <h3>Your latest result</h3>
                    <p>{resultText(game.me.result)}</p>
                  </div>
                )}
              </>
            )}
            {panel === 'rules' && (
              <>
                <p>
                  Choose a room and a secret action. Share what you learned — or
                  bluff. Then vote to banish someone. A strict majority is
                  needed.
                </p>
                <p>
                  Wizards win by banishing every Dragon. Dragons win by stealing
                  all the gold. Guards stop all theft in their room.
                </p>
                <p>
                  {game.settings.rooms.length} rooms · {game.settings.coins}{' '}
                  starting coins per room ·{' '}
                  {game.settings.stealMin ?? game.settings.steal}–
                  {game.settings.stealMax ?? game.settings.steal} coins per
                  theft.
                </p>
                <p>
                  1 / 2 / 3 Dragons for 4–6 / 7–9 / 10–12 players. Room coin
                  counts stay secret.
                </p>
                {host && game.phase === 'lobby' && (
                  <details>
                    <summary>Host settings</summary>
                    <SettingsForm value={config} onChange={setConfig} />
                    <Button
                      className="primary full"
                      disabled={busy || offline}
                      onClick={() =>
                        void send('settings', { settings: config })
                      }
                    >
                      Save settings
                    </Button>
                  </details>
                )}
                {host &&
                  game.demo &&
                  !['lobby', 'over'].includes(game.phase) && (
                    <Button
                      className="secondary full"
                      disabled={busy || offline}
                      onClick={() => void send('demo-next')}
                    >
                      Finish this phase
                    </Button>
                  )}
                <Button className="quiet full" onClick={leave}>
                  Return home
                </Button>
                <p className="tiny">
                  Your identity stays on this device. Rejoin with the same code
                  to return.
                </p>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
