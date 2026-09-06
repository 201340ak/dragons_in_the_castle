'use client';
import { Users, Check, Clock3 } from 'lucide-react';
import type { View } from '@/lib/engine';
import { GameButton, type Send } from './shared';
export function Lobby({
  game,
  send,
  disabled,
}: {
  game: View;
  send: Send;
  disabled: boolean;
}) {
  const me = game.players.find((p) => p.id === game.me.id)!;
  return (
    <div className="panel">
      <div className="row">
        <div>
          <span className="eyebrow">THE ROUND TABLE</span>
          <h2>{game.players.length} adventurers have arrived</h2>
        </div>
        <Users size={30} />
      </div>
      <p>
        Share the code with your friends. Everyone must be ready before the host
        starts.
      </p>
      <div className="player-grid">
        {game.players.map((p, i) => (
          <div key={p.id} className="player-tile">
            <span className={`avatar a${i % 4}`}>{p.name[0]}</span>
            <div>
              <strong>
                {p.name} {p.id === game.me.id ? '(you)' : ''}
              </strong>
              <small>
                {p.id === game.host
                  ? 'Host'
                  : p.bot
                    ? 'Simulated player'
                    : p.online
                      ? 'In the castle'
                      : 'Reconnecting'}
              </small>
            </div>
            <span className={p.ready ? 'ready' : 'pending'}>
              {p.ready ? <Check size={18} /> : <Clock3 size={18} />}
            </span>
          </div>
        ))}
      </div>
      <div className="row wrap">
        <GameButton disabled={disabled} onClick={() => void send('ready')}>
          {me.ready ? 'Not ready yet' : 'I’m ready'}
        </GameButton>
        {game.host === game.me.id && (
          <GameButton
            disabled={
              disabled ||
              game.players.length < 4 ||
              game.players.some((p) => !p.ready)
            }
            onClick={() => void send('start')}
          >
            Start the game
          </GameButton>
        )}
      </div>
      {game.players.length < 4 && (
        <p className="muted">
          Waiting for {4 - game.players.length} more adventurers.
        </p>
      )}
    </div>
  );
}
