'use client';
import { Shield } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { AvatarBadge, type Send } from './shared';
import type { View } from '@/lib/engine';
export function VotePanel({
  game,
  send,
  disabled,
}: {
  game: View;
  send: Send;
  disabled: boolean;
}) {
  const locked = game.me.voted || !game.me.active;
  const selected = game.me.voteTarget || '';
  const candidates = [
    ...game.players.filter((p) => p.active),
    { id: 'skip', name: 'Skip this banishment', avatar: '' },
  ];
  return (
    <div className="panel vote-panel">
      <span className="eyebrow">ANONYMOUS LIVE COUNTS</span>
      <h2>Who should leave the castle?</h2>
      <p>
        A strict majority is needed. Only locked votes count toward banishment.
      </p>
      <output className="vote-status">
        {game.me.voted
          ? 'Your vote is locked. You can keep watching the counts.'
          : !game.me.active
            ? 'You’re watching as a spectator.'
            : 'Choose someone to show your intention, then lock your vote.'}
      </output>
      <RadioGroup
        aria-label="Banishment vote"
        value={selected}
        disabled={locked || disabled}
        onValueChange={(v) => {
          void send('vote-intent', { target: String(v) });
        }}
      >
        {candidates.map((p) => {
          const counts = game.liveVotes?.[p.id] || { tentative: 0, locked: 0 };
          return (
            <label
              key={p.id}
              htmlFor={`vote-${p.id}`}
              className={`vote-candidate ${selected === p.id ? 'selected' : ''}`}
            >
              <div className="vote-candidate-top">
                {p.id === 'skip' ? <Shield /> : <AvatarBadge player={p} />}
                <strong>
                  {p.name}
                  {p.id === game.me.id ? ' (you)' : ''}
                </strong>
                <RadioGroupItem id={`vote-${p.id}`} value={p.id} />
              </div>
              <div className="vote-counts">
                <span aria-hidden="true" className="vote-dots">
                  {Array.from({ length: counts.tentative }, (_, i) => (
                    <i className="tentative" key={'t' + i} />
                  ))}
                  {Array.from({ length: counts.locked }, (_, i) => (
                    <i className="locked" key={'l' + i} />
                  ))}
                </span>
                <span>
                  {counts.tentative} considering · {counts.locked} locked
                </span>
              </div>
            </label>
          );
        })}
      </RadioGroup>
      {!locked && (
        <Button
          className="primary full topgap"
          disabled={disabled || !selected}
          onClick={() => void send('vote', { target: selected })}
        >
          Lock my vote
        </Button>
      )}
    </div>
  );
}
