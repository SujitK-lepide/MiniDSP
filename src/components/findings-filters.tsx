'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DropdownSelect, type SelectOption } from '@/components/dropdown-select';
import { Spinner } from '@/components/spinner';
import type { Detector, Risk } from '@/lib/detectors/types';
import { findingsHref, type FindingsFilters as Filters } from '@/lib/findings/query';
import { DETECTOR_LABELS, DETECTORS } from '@/lib/ui/labels';

const ALL = 'all';

const DETECTOR_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All detectors' },
  ...DETECTORS.map((d) => ({ value: d, label: DETECTOR_LABELS[d] })),
];

// Findings are never stored with risk "None", so it is not offered as a filter.
const RISK_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All risks' },
  ...(['Low', 'Medium', 'High', 'Critical'] as const).map((r) => ({ value: r, label: r })),
];

/** Filters live in the URL; the server page reads them and filters in the database. */
export function FindingsFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (next: Filters) => startTransition(() => router.push(findingsHref(next)));

  const detectorValue = filters.detector ?? ALL;
  const riskValue = filters.risk ?? ALL;

  return (
    <div className="toolbar" role="group" aria-label="Filter findings">
      <DropdownSelect
        key={`detector-${detectorValue}`}
        placeholder="Filter by detector"
        options={DETECTOR_OPTIONS}
        value={detectorValue}
        onChange={(v) => apply({ ...filters, detector: v === ALL ? undefined : (v as Detector) })}
      />
      <DropdownSelect
        key={`risk-${riskValue}`}
        placeholder="Filter by risk"
        options={RISK_OPTIONS}
        value={riskValue}
        onChange={(v) => apply({ ...filters, risk: v === ALL ? undefined : (v as Risk) })}
      />
      {filters.detector || filters.risk ? (
        <a className="lp-link lp-link--standalone" href="/findings">
          Clear filters
        </a>
      ) : null}
      {pending ? (
        <span className="inline-status">
          <Spinner label="Updating findings" /> Updating findings…
        </span>
      ) : null}
    </div>
  );
}
