export const fmtTime = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(d) + ' ET' : '--';
