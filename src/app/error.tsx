'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <main id="main" className="container section">
      <div role="alert" className="error-page">
        <span className="eyebrow">Something went wrong</span>
        <h1>Flag on the play.</h1>
        <p className="muted" style={{ fontSize: '1.15rem', marginBottom: 28 }}>Something broke on our end. It has been logged.{error.digest ? ` Reference ${error.digest}.` : ''}</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
