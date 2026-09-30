'use client';
import { useEffect, useState } from 'react';
import { SoundIcon } from '../Icons';
import { onSoundChange, setSound, soundOn } from './sound';

export function SoundToggle() {
  const [on, setOn] = useState(false);
  // Mount after paint (localStorage is not available during SSR), then follow live changes
  // from the profile settings toggle so the label never contradicts the actual state.
  useEffect(() => {
    setOn(soundOn());
    return onSoundChange(setOn);
  }, []);
  return (
    <button type="button" className="btn btn-sm" aria-pressed={on} onClick={() => { setSound(!on); }}>
      <SoundIcon size={16} on={on} /> Sound {on ? 'on' : 'off'}
    </button>
  );
}
