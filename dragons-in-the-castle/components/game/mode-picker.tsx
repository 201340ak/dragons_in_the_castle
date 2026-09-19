'use client';
import { useId } from 'react';
import { Coins, Crown } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function ModePicker({ disabled = false }: { disabled?: boolean }) {
  const id = useId();
  return (
    <fieldset className="game-mode-picker" disabled={disabled}>
      <legend>Game mode</legend>
      <RadioGroup
        value="steal-the-treasure"
        disabled={disabled}
        aria-label="Game mode"
      >
        <label className="game-mode-option selected" htmlFor={`${id}-treasure`}>
          <Coins aria-hidden="true" />
          <span>
            <strong>Steal the Treasure</strong>
            <small>Protect the gold. Unmask the Dragons.</small>
          </span>
          <RadioGroupItem id={`${id}-treasure`} value="steal-the-treasure" />
        </label>
        <label className="game-mode-option unavailable" htmlFor={`${id}-king`}>
          <Crown aria-hidden="true" />
          <span>
            <strong>Eat the King</strong>
            <small>Coming soon</small>
          </span>
          <RadioGroupItem id={`${id}-king`} value="eat-the-king" disabled />
        </label>
      </RadioGroup>
    </fieldset>
  );
}
