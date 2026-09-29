'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <main id="main" className="container section">
      <div role="alert" className="card card-error">
        <h1 style={{ fontSize: '1.4rem' }}>Flag on the play.</h1>
        <p className="muted">Something broke on our end. It has been logged.{error.digest ? ` Reference ${error.digest}.` : ''}</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
