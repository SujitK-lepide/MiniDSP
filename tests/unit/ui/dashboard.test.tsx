import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardView } from '@/components/dashboard-view';
import { summarizeScans, type RecentScan, type ScanStatRow } from '@/lib/dashboard/summary';

const STATS: ScanStatRow[] = [
  { risk: 'Critical', total_findings: 7 },
  { risk: 'Critical', total_findings: 2 },
  { risk: 'High', total_findings: 3 },
  { risk: 'Medium', total_findings: 1 },
  { risk: 'Low', total_findings: 4 },
  { risk: 'None', total_findings: 0 },
  { risk: 'None', total_findings: 0 },
];

const RECENT: RecentScan[] = [
  { id: 's1', filename: '22_all_four.csv', risk: 'Critical', total_findings: 7, created_at: '2026-10-21T06:10:00Z' },
  { id: 's2', filename: '01_clean_notes.txt', risk: 'None', total_findings: 0, created_at: '2026-10-21T06:05:00Z' },
];

describe('summarizeScans', () => {
  it('computes totals and the risk distribution', () => {
    expect(summarizeScans(STATS)).toEqual({
      filesScanned: 7,
      totalFindings: 17,
      highOrCritical: 3,
      distribution: { None: 2, Low: 1, Medium: 1, High: 1, Critical: 2 },
    });
  });

  it('handles no scans', () => {
    expect(summarizeScans([])).toEqual({
      filesScanned: 0,
      totalFindings: 0,
      highOrCritical: 0,
      distribution: { None: 0, Low: 0, Medium: 0, High: 0, Critical: 0 },
    });
  });
});

describe('DashboardView', () => {
  it('shows totals that match the mocked data', () => {
    render(<DashboardView summary={summarizeScans(STATS)} recent={RECENT} />);
    expect(screen.getByTestId('kpi-files')).toHaveTextContent('7');
    expect(screen.getByTestId('kpi-findings')).toHaveTextContent('17');
    expect(screen.getByTestId('kpi-high-critical')).toHaveTextContent('3');

    const expected = { None: '2', Low: '1', Medium: '1', High: '1', Critical: '2' };
    for (const [risk, count] of Object.entries(expected)) {
      const row = screen.getByTestId(`dist-${risk}`);
      expect(within(row).getByText(risk)).toBeInTheDocument();
      expect(within(row).getByText(count)).toBeInTheDocument();
    }
  });

  it('lists recent scans with risk text', () => {
    render(<DashboardView summary={summarizeScans(STATS)} recent={RECENT} />);
    const table = screen.getByRole('table', { name: '10 most recent scans' });
    expect(within(table).getByText('22_all_four.csv')).toBeInTheDocument();
    expect(within(table).getByText('01_clean_notes.txt')).toBeInTheDocument();
    expect(within(table).getByText('Critical')).toBeInTheDocument();
    expect(within(table).getByText('None')).toBeInTheDocument();
  });

  it('shows the empty state when nothing has been scanned', () => {
    render(<DashboardView summary={summarizeScans([])} recent={[]} />);
    expect(screen.getByText(/No files scanned yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upload a file' })).toHaveAttribute('href', '/upload');
    expect(screen.queryByTestId('kpi-files')).toBeNull();
  });
});
