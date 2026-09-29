/** Only allow same-origin relative paths as post-login destinations. */
export function safeNext(raw: unknown, fallback = '/profile'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw.startsWith('/api/') || raw.startsWith('/login') || raw.startsWith('/register')) return fallback;
  return raw.slice(0, 300);
}
