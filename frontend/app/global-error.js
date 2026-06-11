'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Panel from './components/ui/Panel';
import Button from './components/ui/Button';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      });
    }
    // eslint-disable-next-line no-console
    console.error('[route error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-ink text-parchment min-h-screen flex items-center justify-center px-6 font-body">
        <Panel className="p-8 max-w-md text-center">
          <p className="font-display text-xl mb-2">Something went wrong.</p>
          <p className="text-sm text-slate-muted mb-6">
            This has been logged. You can try again or head back home.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Link href="/" className="text-sm text-slate-muted hover:text-parchment transition-colors">
              Go home
            </Link>
          </div>
        </Panel>
      </body>
    </html>
  );
}
