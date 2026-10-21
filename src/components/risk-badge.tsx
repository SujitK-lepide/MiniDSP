import type { Risk } from '@/lib/detectors/types';
import { RISK_BADGE_VARIANT } from '@/lib/ui/labels';

/** Status is never conveyed by colour alone: the badge text is the risk level. */
export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className={`lp-badge lp-badge--${RISK_BADGE_VARIANT[risk]}`}>
      <span className="lp-badge__dot"></span>
      {risk}
    </span>
  );
}
