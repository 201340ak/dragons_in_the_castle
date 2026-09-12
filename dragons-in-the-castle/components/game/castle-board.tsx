'use client';
import type { CSSProperties } from 'react';
import { LockKeyhole } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AvatarBadge } from './shared';

// Receives only room labels and the local player's destination, never secret
// server room totals or other players' choices. Objects/effects can be layered
// into each room when a future mode explicitly makes them visible.
export function CastleBoard({
  rooms,
  selected,
  onSelect,
  player,
  disabled = false,
}: {
  rooms: string[];
  selected: string;
  onSelect: (room: string) => void;
  player: { name: string; avatar?: string };
  disabled?: boolean;
}) {
  const position = rooms.indexOf(selected);
  return (
    <div className="castle-board">
      <div className="castle-board-caption">
        <span>THE CASTLE</span>
        <span>
          <LockKeyhole size={12} /> Private destinations
        </span>
      </div>
      <div className="castle-cutaway">
        <RadioGroup
          value={selected}
          onValueChange={(value) => onSelect(String(value))}
          disabled={disabled}
          className="castle-rooms"
          aria-label="Choose a room on the castle map"
        >
          {rooms.map((room, index) => (
            <label
              key={room}
              htmlFor={`castle-room-${index}`}
              className={`castle-room ${selected === room ? 'chosen' : ''}`}
              style={
                {
                  '--room-x': `${(roomArt(room, index) % 2) * 100}%`,
                  '--room-y': `${Math.floor(roomArt(room, index) / 2) * 50}%`,
                } as CSSProperties
              }
            >
              <span className="castle-interior" aria-hidden="true" />
              <span className="castle-room-label">
                <span>{room}</span>
                <RadioGroupItem id={`castle-room-${index}`} value={room} />
              </span>
            </label>
          ))}
        </RadioGroup>
        {position >= 0 && (
          <div
            className="castle-pawn"
            aria-hidden="true"
            style={{
              left: `calc(${position % 2 ? '75%' : '25%'} - 18px)`,
              top: `calc(${Math.floor(position / 2)} * (var(--castle-room-height) + 6px) + var(--castle-room-height) - 66px)`,
            }}
          >
            <AvatarBadge player={player} />
            <span>You</span>
          </div>
        )}
      </div>
      <p className="castle-location" aria-live="polite">
        {selected
          ? `Your doorway: ${selected}`
          : 'Tap a room to choose your destination.'}
      </p>
    </div>
  );
}

function roomArt(room: string, index: number) {
  const name = room.toLowerCase();
  if (name.includes('treas')) return 0;
  if (name.includes('libra')) return 1;
  if (name.includes('tower')) return 2;
  if (name.includes('dungeon') || name.includes('vault')) return 3;
  if (name.includes('alchem')) return 4;
  if (name.includes('hall')) return 5;
  return index % 6;
}

export function RoundTrack({
  round,
  role,
  sealed,
}: {
  round: number;
  role?: string;
  sealed: boolean;
}) {
  return (
    <div className="castle-round-track">
      <div>
        <strong>Round {round}</strong>
        <span>
          {role === 'Dragon'
            ? 'Steal all the gold'
            : 'Find and banish every Dragon'}
        </span>
      </div>
      <ol aria-label="Round stages">
        {['Choose', 'Resolve', 'Discuss', 'Vote'].map((stage, index) => (
          <li key={stage} aria-current={index === 0 ? 'step' : undefined}>
            {index === 0 && sealed ? 'Sealed' : stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
