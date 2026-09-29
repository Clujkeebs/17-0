'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';
export function LeaderboardViewed({ tab }: { tab: string }) { useEffect(() => track('leaderboard_viewed', { tab }), [tab]); return null; }
