'use client';

import { useActionState } from 'react';
import { LpMessage } from '@/components/lp-message';
import { login, type LoginState } from '@/lib/auth/actions';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <form action={formAction} className="form-stack" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="lp-input lp-input--full-width">
        <div className="lp-input__row lp-input__row--label-top">
          <label className="lp-input__label" htmlFor="email">
            Email
          </label>
          <div className={state.error ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
            <input
              className="lp-input__input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={state.error ? true : undefined}
              disabled={pending}
            />
          </div>
        </div>
      </div>
      <div className="lp-input lp-input--full-width">
        <div className="lp-input__row lp-input__row--label-top">
          <label className="lp-input__label" htmlFor="password">
            Password
          </label>
          <div className={state.error ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
            <input
              className="lp-input__input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={state.error ? true : undefined}
              disabled={pending}
            />
          </div>
        </div>
      </div>
      {state.error ? (
        <LpMessage variant="error" title="Sign-in failed">
          {state.error}
        </LpMessage>
      ) : null}
      <button type="submit" className="lp-button lp-button--primary lp-button--md lp-button--full-width" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
