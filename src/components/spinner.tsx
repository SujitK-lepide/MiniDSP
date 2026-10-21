/** lp-spinner with a visually hidden status label. */
export function Spinner({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`lp-spinner lp-spinner--${size}`} role="status">
      <svg className="lp-spinner__svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="lp-spinner__track" cx="12" cy="12" r="10" strokeWidth="3" />
        <circle
          className="lp-spinner__arc"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="3"
          strokeLinecap="round"
          {...{ 'path-length': '100' }}
          strokeDasharray="28 72"
        />
      </svg>
      <span className="lp-spinner__visually-hidden">{label}</span>
    </span>
  );
}
