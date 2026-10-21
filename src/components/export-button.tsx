import type { FindingsFilters } from '@/lib/findings/query';

/** Native GET form → /api/export with the current filters; the attachment response downloads. */
export function ExportButton({ filters }: { filters: FindingsFilters }) {
  return (
    <form method="get" action="/api/export">
      {filters.detector ? <input type="hidden" name="detector" value={filters.detector} /> : null}
      {filters.risk ? <input type="hidden" name="risk" value={filters.risk} /> : null}
      <button type="submit" className="lp-button lp-button--secondary lp-button--md">
        Export CSV
      </button>
    </form>
  );
}
