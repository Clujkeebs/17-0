'use client';
import { useEffect, useState } from 'react';
import { SoundIcon } from '../Icons';
import { setSound, soundOn } from './sound';

export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button type="button" className="btn btn-sm" aria-pressed={on} onClick={() => { setSound(!on); setOn(!on); }}>
      <SoundIcon size={16} on={on} /> Sound {on ? 'on' : 'off'}
    </button>
  );
}
