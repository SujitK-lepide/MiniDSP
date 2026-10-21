'use client';

import { useActionState } from 'react';
import { LpMessage } from '@/components/lp-message';
import { signUp, type SignupState } from '@/lib/auth/actions';
import type { SignupFieldErrors } from '@/lib/auth/signup';

const INITIAL: SignupState = { status: 'idle', message: null, fieldErrors: {} };

function Field({
  id,
  label,
  type,
  autoComplete,
  help,
  error,
  disabled,
}: {
  id: keyof SignupFieldErrors;
  label: string;
  type: string;
  autoComplete: string;
  help?: string;
  error?: string;
  disabled: boolean;
}) {
  const msgId = `${id}-msg`;
  const message = error ?? help;
  return (
    <div className="lp-input lp-input--full-width">
      <div className="lp-input__row lp-input__row--label-top">
        <label className="lp-input__label" htmlFor={id}>
          {label}
        </label>
        <div className={error ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
          <input
            className="lp-input__input"
            id={id}
            name={id}
            type={type}
            autoComplete={autoComplete}
            required
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? msgId : undefined}
          />
        </div>
      </div>
      {message ? (
        <div id={msgId} className={error ? 'lp-input__message lp-input__message--error' : 'lp-input__message'}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signUp, INITIAL);

  if (state.status === 'check-email') {
    return (
      <LpMessage
        variant="success"
        title="Check your email"
        actions={
          <a className="lp-link lp-link--standalone" href="/login">
            Go to sign in
          </a>
        }
      >
        We sent a confirmation link to your email address. Open it to activate your account, then sign in.
      </LpMessage>
    );
  }

  return (
    <form action={formAction} className="form-stack" noValidate>
      <Field id="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors.email} disabled={pending} />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        help="At least 8 characters."
        error={state.fieldErrors.password}
        disabled={pending}
      />
      <Field
        id="confirm"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors.confirm}
        disabled={pending}
      />
      {state.message ? (
        <LpMessage variant="error" title="Sign-up failed">
          {state.message}
        </LpMessage>
      ) : null}
      <button type="submit" className="lp-button lp-button--primary lp-button--md lp-button--full-width" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
