'use client';

import { LpMessage } from '@/components/lp-message';

/** Shared body for route error boundaries. Never shows error details (they may contain internals). */
export function RouteError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <main className="auth-page">
      <div className="auth-page__panel">
        <LpMessage
          variant="error"
          title={title}
          actions={
            <>
              <a className="lp-link lp-link--standalone" href="/dashboard">
                Go to dashboard
              </a>
              <button type="button" className="lp-button lp-button--primary lp-button--sm" onClick={() => retry()}>
                Try again
              </button>
            </>
          }
        >
          Something went wrong while loading this page. Your data has not changed. Try again in a moment.
        </LpMessage>
      </div>
    </main>
  );
}
