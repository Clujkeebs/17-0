import { doubleDay } from '@/lib/server/points';
import { dailyDateET } from '@/lib/game/daily';
import { WEEKDAYS, weekdayOf } from '@/lib/badges';

/** One line about the Daily Double: live today, or which day it comes back. Nothing when the owner switched it off. */
export async function DoubleNote() {
  const day = await doubleDay().catch(() => null);
  if (day === null) return null;
  const today = weekdayOf(dailyDateET()) === day;
  return (
    <p className={today ? 'double-note on' : 'double-note'}>
      {today ? <><strong>Daily Double today.</strong> Ranked games pay double points until midnight ET.</> : <>Daily Double: ranked games pay double points every {WEEKDAYS[day]}.</>}
    </p>
  );
}
