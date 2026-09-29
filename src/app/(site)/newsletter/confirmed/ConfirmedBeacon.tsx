'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export function ConfirmedBeacon() {
  useEffect(() => { track('newsletter_confirmed'); }, []);
  return null;
}
