'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ background: '#0A1128', color: '#F8F9FA', fontFamily: 'system-ui', padding: 32 }}>
      <h1>Flag on the play.</h1><p>Something broke on our end. It has been logged.</p>
      <button onClick={reset} style={{ background: '#E76F51', color: '#0A1128', border: 0, padding: '12px 20px', fontWeight: 700 }}>Try again</button>
    </body></html>
  );
}
