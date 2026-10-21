import type { ReactNode } from 'react';

type Variant = 'error' | 'success';

function Icon({ variant }: { variant: Variant }) {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 45 45" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
        <path d="M14 23.5 20 29.5 31 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 45 45" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="41" height="41" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22.5 12 33 31.5H12L22.5 12Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 20v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22.5" cy="28.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** lp-message: icon + content > text > title / body (+ optional actions). */
export function LpMessage({
  variant,
  title,
  children,
  actions,
}: {
  variant: Variant;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`lp-message lp-message--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="lp-message__icon">
        <Icon variant={variant} />
      </span>
      <div className="lp-message__content">
        <div className="lp-message__text">
          <h3 className="lp-message__title">{title}</h3>
          {children ? <p className="lp-message__body">{children}</p> : null}
        </div>
        {actions ? <div className="lp-message__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
