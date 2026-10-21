import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { FindingsFilters } from '@/components/findings-filters';
import { fetchFindings, findingsHref, parseFindingsFilters } from '@/lib/findings/query';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Simulates what lepidus.js does when an option is picked: fire lp-dropdown-change from the wrapper. */
function pick(groupName: RegExp, optionLabel: string) {
  const listbox = screen.getByRole('listbox', { name: groupName, hidden: true });
  const option = within(listbox).getByRole('option', { name: optionLabel, hidden: true });
  option.dispatchEvent(new CustomEvent('lp-dropdown-change', { detail: { option }, bubbles: true }));
}

beforeEach(() => push.mockReset());
afterEach(() => {
  delete window.Lepidus;
});

describe('FindingsFilters → URL query', () => {
  it('selecting a detector pushes ?detector=…', () => {
    render(<FindingsFilters filters={{}} />);
    pick(/filter by detector/i, 'Email address');
    expect(push).toHaveBeenCalledWith('/findings?detector=email');
  });

  it('adds risk while keeping the detector', () => {
    render(<FindingsFilters filters={{ detector: 'email' }} />);
    pick(/filter by risk/i, 'High');
    expect(push).toHaveBeenCalledWith('/findings?detector=email&risk=High');
  });

  it('"All detectors" removes only the detector filter', () => {
    render(<FindingsFilters filters={{ detector: 'uk_nino', risk: 'High' }} />);
    pick(/filter by detector/i, 'All detectors');
    expect(push).toHaveBeenCalledWith('/findings?risk=High');
  });

  it('shows the current selection on the trigger and a Clear filters link', () => {
    render(<FindingsFilters filters={{ detector: 'payment_card', risk: 'Critical' }} />);
    const triggers = screen.getAllByRole('button', { expanded: false });
    expect(triggers.map((t) => t.textContent)).toEqual(expect.arrayContaining(['Payment card', 'Critical']));
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/findings');
  });

  it('initialises lepidus.js dropdowns mounted after the script loaded', () => {
    const initDropdown = vi.fn();
    window.Lepidus = { init: vi.fn(), initDropdown };
    render(<FindingsFilters filters={{}} />);
    expect(initDropdown).toHaveBeenCalledTimes(2);
  });
});

describe('findings query (server side)', () => {
  function mockClient() {
    const calls: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) {
      builder[m] = (...args: unknown[]) => {
        calls.push([m, ...args]);
        return builder;
      };
    }
    builder.range = async (...args: unknown[]) => {
      calls.push(['range', ...args]);
      return { data: [], error: null, count: 0 };
    };
    const client = {
      from: (table: string) => {
        calls.push(['from', table]);
        return builder;
      },
    };
    return { client: client as unknown as SupabaseClient, calls };
  }

  it('applies detector and risk filters in the database query', async () => {
    const { client, calls } = mockClient();
    await fetchFindings(client, { detector: 'email', risk: 'Low' });
    expect(calls).toContainEqual(['from', 'findings']);
    expect(calls).toContainEqual(['eq', 'detector', 'email']);
    expect(calls).toContainEqual(['eq', 'risk', 'Low']);
  });

  it('applies no filter when none is set', async () => {
    const { client, calls } = mockClient();
    await fetchFindings(client, {});
    expect(calls.filter((c) => c[0] === 'eq')).toEqual([]);
  });

  it('ignores unknown or malicious filter values from the URL', () => {
    expect(parseFindingsFilters({ detector: 'email', risk: 'High' })).toEqual({ detector: 'email', risk: 'High' });
    expect(parseFindingsFilters({ detector: "x' or 1=1", risk: 'SEVERE' })).toEqual({
      detector: undefined,
      risk: undefined,
    });
    expect(parseFindingsFilters({ detector: ['uk_phone', 'email'] })).toEqual({ detector: 'uk_phone', risk: undefined });
    expect(findingsHref({})).toBe('/findings');
  });
});
