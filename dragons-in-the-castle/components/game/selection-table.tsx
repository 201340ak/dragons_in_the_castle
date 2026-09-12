'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import { ACTIONS, type Action, type View } from '@/lib/engine';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CastleBoard, RoundTrack } from './castle-board';
import type { Send } from './shared';

const descriptions: Record<Action, string> = {
  'Count Coins': 'Learn how much gold remains.',
  'Guard Room': 'Stop every theft in this room.',
  Investigate: 'Look for traces of other actions.',
  'Steal Coins': 'Take gold. Keep your secret.',
};

export function SelectionTable({
  game,
  send,
  disabled,
}: {
  game: View;
  send: Send;
  disabled: boolean;
}) {
  const [room, setRoom] = useState(game.me.choice?.room || '');
  const [action, setAction] = useState<Action | ''>(
    game.me.choice?.action || '',
  );
  const [theftAmount, setTheftAmount] = useState(
    game.settings.stealMin ?? game.settings.steal,
  );
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const flight = useRef(false);
  const sealed = !!game.me.choice || confirmed;
  const destination = game.me.choice?.room || room;
  const blocked = disabled || submitting || sealed;
  const bounds = game.me.theftBounds?.[destination];
  const amount = bounds
    ? Math.max(bounds.min, Math.min(theftAmount, bounds.max))
    : theftAmount;
  const active = game.players.filter((player) => player.active);
  const submitted = active.filter(
    (player) => player.submitted || (confirmed && player.id === game.me.id),
  ).length;
  const seal = async () => {
    if (blocked || flight.current || !destination || !action) return;
    flight.current = true;
    setSubmitting(true);
    try {
      await send(
        'action',
        {
          room: destination,
          action,
          ...(action === 'Steal Coins' ? { amount } : {}),
        },
        () => setConfirmed(true),
      );
    } finally {
      flight.current = false;
      setSubmitting(false);
    }
  };
  return (
    <section className="selection-table" aria-label="Your castle turn">
      <RoundTrack round={game.round} role={game.me.role} sealed={sealed} />
      <CastleBoard
        rooms={game.settings.rooms}
        selected={destination}
        onSelect={setRoom}
        player={game.players.find((player) => player.id === game.me.id)!}
        disabled={blocked}
      />
      <div className={`table-hand ${sealed ? 'is-sealed' : ''}`}>
        {sealed ? (
          <div className={`sealed-choice ${confirmed ? 'just-sealed' : ''}`}>
            <LockKeyhole size={32} />
            <strong>Choice sealed</strong>
            <span>{destination}</span>
            <small>Your action stays face-down.</small>
          </div>
        ) : destination ? (
          <>
            <div className="hand-heading">
              <h2>Choose your card</h2>
              <span>{destination}</span>
            </div>
            <RadioGroup
              value={action}
              onValueChange={(value) => setAction(value as Action)}
              disabled={blocked}
              className="action-hand"
              aria-label="Choose a secret action card"
            >
              {ACTIONS.filter(
                (option) =>
                  option !== 'Steal Coins' || game.me.role === 'Dragon',
              ).map((option) => {
                const index = ACTIONS.indexOf(option);
                return (
                  <label
                    className={`table-action-card ${action === option ? 'chosen' : ''}`}
                    key={option}
                    htmlFor={`table-action-${index}`}
                  >
                    <span
                      className="table-action-art"
                      aria-hidden="true"
                      style={
                        {
                          backgroundPosition: `${(index % 2) * 100}% ${Math.floor(index / 2) * 100}%`,
                        } as CSSProperties
                      }
                    />
                    <span className="table-action-title">
                      <strong>{option}</strong>
                      <RadioGroupItem
                        id={`table-action-${index}`}
                        value={option}
                      />
                    </span>
                    <small>{descriptions[option]}</small>
                  </label>
                );
              })}
            </RadioGroup>
            {action === 'Steal Coins' && bounds && (
              <label className="table-theft">
                Coins to steal
                <input
                  type="number"
                  inputMode="numeric"
                  min={bounds.min}
                  max={bounds.max}
                  value={amount}
                  disabled={bounds.min === bounds.max || blocked}
                  onChange={(event) =>
                    setTheftAmount(Number(event.target.value))
                  }
                />
              </label>
            )}
            <div className="seal-controls">
              <Button
                className="primary full"
                disabled={blocked || !action}
                onClick={() => void seal()}
              >
                <LockKeyhole size={18} />
                {submitting ? 'Sealing…' : 'Seal my card'}
              </Button>
              <p>Change rooms or cards until you seal.</p>
            </div>
          </>
        ) : (
          <p className="table-instruction">
            Choose a doorway above. Your action cards will appear here.
          </p>
        )}
      </div>
      {sealed && (
        <div className="table-waiting">
          <output>
            {submitted} of {active.length} choices sealed
          </output>
          <div className="waiting-dots" aria-hidden="true">
            {active.map((player) => (
              <span
                key={player.id}
                className={
                  player.submitted || (confirmed && player.id === game.me.id)
                    ? 'done'
                    : ''
                }
              >
                {player.submitted || (confirmed && player.id === game.me.id) ? (
                  <Check size={16} />
                ) : (
                  player.name[0]
                )}
              </span>
            ))}
          </div>
          <p>Results appear when everyone chooses or time runs out.</p>
        </div>
      )}
    </section>
  );
}
