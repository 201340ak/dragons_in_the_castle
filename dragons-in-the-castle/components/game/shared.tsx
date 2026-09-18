'use client';
import { useId } from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Settings, Result, View } from '@/lib/engine';
export type Send = (
  type: string,
  extra?: Record<string, unknown>,
  onAccepted?: () => void,
) => Promise<View | undefined>;
export function AvatarBadge({
  player,
  index = 0,
}: {
  player: { name: string; avatar?: string };
  index?: number;
}) {
  return (
    <span className={`avatar a${index % 4} ${player.avatar ? 'emoji' : ''}`}>
      {player.avatar || player.name[0]}
    </span>
  );
}
export function GameButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Button
      className={secondary ? 'secondary' : 'primary'}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
export function SettingsForm({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
}) {
  const hostAdvanceId = useId();
  return (
    <div className="settings-grid">
      {(
        [
          ['coins', 'Coins per room'],
          ['stealMin', 'Minimum coins per theft'],
          ['stealMax', 'Maximum coins per theft'],
          ['selection', 'Selection · seconds'],
          ['discussion', 'Round table · seconds'],
          ['vote', 'Vote · seconds'],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="number"
            disabled={key === 'discussion' && value.roundTableUntimed}
            min={1}
            max={
              key === 'coins'
                ? 100
                : key === 'stealMin' || key === 'stealMax'
                  ? value.coins
                  : 600
            }
            value={value[key] ?? value.steal}
            onChange={(e) =>
              onChange({ ...value, [key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      <label className="wide">
        Round table timing
        <select
          value={value.roundTableUntimed ? 'untimed' : 'timed'}
          onChange={(e) =>
            onChange({
              ...value,
              roundTableUntimed: e.target.value === 'untimed',
            })
          }
        >
          <option value="timed">
            Timed · end early when everyone is ready
          </option>
          <option value="untimed">
            No timer · wait until everyone is ready
          </option>
        </select>
      </label>
      {value.roundTableUntimed && (
        <>
          <label className="checkrow wide" htmlFor={hostAdvanceId}>
            <Checkbox
              id={hostAdvanceId}
              checked={value.roundTableHostAdvance ?? false}
              onCheckedChange={(checked) =>
                onChange({ ...value, roundTableHostAdvance: checked })
              }
            />
            Allow the host to start voting before everyone is ready
          </label>
          <p className="wide tiny">
            Everyone must post a claim and mark ready. Disconnected players keep
            their seats. Only the Round table is untimed; choosing actions and
            voting still have timers.
          </p>
        </>
      )}
      <p className="wide">
        Dragons: 1 for 4–6 players, 2 for 7–9, 3 for 10–12.
      </p>
      <label className="wide">
        Rooms · one per line
        <textarea
          value={value.rooms.join('\n')}
          onChange={(e) =>
            onChange({ ...value, rooms: e.target.value.split('\n') })
          }
        />
      </label>
      <label className="checkrow">
        <Checkbox
          checked={value.reveal}
          onCheckedChange={(checked) => onChange({ ...value, reveal: checked })}
        />{' '}
        Reveal banished roles
      </label>
      <label className="checkrow">
        <Checkbox
          checked={value.clue}
          onCheckedChange={(checked) => onChange({ ...value, clue: checked })}
        />{' '}
        Investigation action clues
      </label>
    </div>
  );
}
export function resultText(r?: Result) {
  if (!r)
    return 'You missed the selection deadline. You stayed outside this round.';
  return `${r.others} other ${r.others === 1 ? 'player entered' : 'players entered'} ${r.room}. ${r.coins !== undefined ? `${r.coins} coins remain.` : ''}${r.action === 'Guard Room' ? (r.blocked ? ' You blocked at least one theft.' : ' No theft was attempted here.') : ''}${r.stolen !== undefined ? ` You stole ${r.stolen} coins.${r.blocked ? ' The room was guarded.' : ''}` : ''}${r.groups ? ` Actions: ${r.groups.protective} protective, ${r.groups.informational} informational, ${r.groups.unknown} unknown.` : ''}`;
}
export function Gold({ rooms }: { rooms: Record<string, number> }) {
  return (
    <div className="coin-row">
      {Object.entries(rooms).map(([r, n]) => (
        <span key={r}>
          {r}
          <b>
            {n} <Coins size={16} />
          </b>
        </span>
      ))}
    </div>
  );
}
