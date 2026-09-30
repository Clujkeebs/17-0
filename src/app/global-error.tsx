'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ background: '#FFFFFF', color: '#0A0A0A', fontFamily: 'system-ui', padding: 32 }}>
      <h1>Flag on the play.</h1><p>Something broke on our end. It has been logged.</p>
      <button onClick={reset} style={{ background: '#0A0A0A', color: '#FFFFFF', border: 0, borderRadius: 999, padding: '12px 22px', fontWeight: 600 }}>Try again</button>
    </body></html>
  );
}
