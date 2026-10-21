import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FindingsTable } from '@/components/findings-table';
import { RiskBadge } from '@/components/risk-badge';
import { RISK_ORDER } from '@/lib/detectors/classify';
import type { FindingRow } from '@/lib/findings/query';

describe('RiskBadge', () => {
  it.each(RISK_ORDER)('shows the text "%s" (not colour alone)', (risk) => {
    render(<RiskBadge risk={risk} />);
    const badge = screen.getByText(risk);
    expect(badge).toHaveClass('lp-badge');
    expect(badge.textContent).toBe(risk);
  });

  it('uses documented lp-badge variants only', () => {
    const { container } = render(
      <>
        {RISK_ORDER.map((r) => (
          <RiskBadge key={r} risk={r} />
        ))}
      </>,
    );
    const legal = new Set(['lp-badge', 'lp-badge--success', 'lp-badge--neutral', 'lp-badge--warning', 'lp-badge--error', 'lp-badge__dot']);
    container.querySelectorAll('[class]').forEach((el) => {
      el.classList.forEach((c) => expect(legal.has(c)).toBe(true));
    });
  });
});

describe('FindingsTable', () => {
  it('renders the empty state when there are no findings', () => {
    render(<FindingsTable rows={[]} filtered={false} />);
    expect(screen.getByText(/No findings yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upload a file' })).toHaveAttribute('href', '/upload');
  });

  it('renders a filter-specific empty state when filters exclude everything', () => {
    render(<FindingsTable rows={[]} filtered />);
    expect(screen.getByText(/No findings match these filters/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/findings');
  });

  it('renders filename, date, detector, risk text, count and masked example', () => {
    const rows: FindingRow[] = [
      {
        id: 'f1',
        filename: 'customers.csv',
        scannedAt: '2026-10-21T06:00:00Z',
        detector: 'payment_card',
        risk: 'Critical',
        occurrences: 2,
        maskedExample: '************1111',
      },
    ];
    render(<FindingsTable rows={rows} filtered={false} />);
    expect(screen.getByRole('columnheader', { name: 'Masked example' })).toBeInTheDocument();
    expect(screen.getByText('customers.csv')).toBeInTheDocument();
    expect(screen.getByText('21 Oct 2026, 06:00 UTC')).toBeInTheDocument();
    expect(screen.getByText('Payment card')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('************1111')).toBeInTheDocument();
  });

  it('renders untrusted filenames as text, not HTML', () => {
    const rows: FindingRow[] = [
      {
        id: 'x',
        filename: '<img src=x onerror=alert(1)>.csv',
        scannedAt: '2026-10-21T06:00:00Z',
        detector: 'email',
        risk: 'Low',
        occurrences: 1,
        maskedExample: 'a***@example.test',
      },
    ];
    const { container } = render(<FindingsTable rows={rows} filtered={false} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>.csv')).toBeInTheDocument();
  });
});
