import type { ReactNode } from 'react';

/** Canonical lp-table pieces (wrapper > table, header-inner/label, cell-inner/cell-text). */
export function LpTable({ caption, head, children }: { caption: string; head: ReactNode; children: ReactNode }) {
  return (
    <div className="lp-table">
      <table className="lp-table__table">
        <caption style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>{caption}</caption>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children }: { children: string }) {
  return (
    <th className="lp-table__th" scope="col">
      <div className="lp-table__header-inner">
        <span className="lp-table__header-label">{children}</span>
      </div>
    </th>
  );
}

/** Text content is wrapped in lp-table__cell-text; components (badges, links) go in as-is. */
export function Td({ children }: { children: ReactNode }) {
  const isText = typeof children === 'string' || typeof children === 'number';
  return (
    <td className="lp-table__td">
      <div className="lp-table__cell-inner">
        {isText ? <span className="lp-table__cell-text">{children}</span> : children}
      </div>
    </td>
  );
}

/** Single full-width cell for the "no rows" state (Table anatomy part 7). */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td className="lp-table__empty-cell" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
