/** Skeleton for a page body while server data loads (known layout → Skeleton). */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <main className="app-main" aria-busy="true">
      <span className="visually-hidden" role="status">
        {label}
      </span>
      <div className="lp-skeleton-paragraph" aria-hidden="true">
        <span className="lp-skeleton lp-skeleton--text"></span>
        <span className="lp-skeleton lp-skeleton--text lp-skeleton-paragraph__last-line"></span>
      </div>
      <span className="lp-skeleton lp-skeleton--rect" aria-hidden="true"></span>
      <span className="lp-skeleton lp-skeleton--rect" aria-hidden="true"></span>
    </main>
  );
}
