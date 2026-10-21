// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const calls: Array<[string, ...unknown[]]> = [];
let pages: unknown[][] = [];
let queryError: { code: string } | null = null;

function builder() {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return b;
    };
  }
  b.range = async (from: number, to: number) => {
    calls.push(['range', from, to]);
    if (queryError) return { data: null, error: queryError, count: null };
    return { data: pages.shift() ?? [], error: null, count: null };
  };
  return b;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: (t: string) => {
      calls.push(['from', t]);
      return builder();
    },
  })),
}));

const { GET } = await import('@/app/api/export/route');

const dbRow = (i: number, over: Record<string, unknown> = {}) => ({
  id: `id-${i}`,
  detector: 'payment_card',
  risk: 'Critical',
  occurrences: 1,
  masked_example: '************1111',
  created_at: '2026-10-21T06:00:00.000Z',
  scan: { filename: `file-${i}.csv`, created_at: '2026-10-21T06:00:00.000Z' },
  ...over,
});

beforeEach(() => {
  calls.length = 0;
  pages = [];
  queryError = null;
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
});

describe('GET /api/export', () => {
  it('returns 401 and does not query when signed out', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(new Request('http://localhost/api/export'));
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('returns a CSV attachment with the same filters as /findings', async () => {
    pages = [[dbRow(1, { scan: { filename: '=HYPERLINK("http://x")', created_at: '2026-10-21T06:00:00.000Z' } })]];
    const res = await GET(new Request('http://localhost/api/export?detector=payment_card&risk=Critical'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="minidsp-findings-\d{8}-\d{6}\.csv"$/);
    expect(res.headers.get('cache-control')).toBe('no-store');

    expect(calls).toContainEqual(['from', 'findings']);
    expect(calls).toContainEqual(['eq', 'detector', 'payment_card']);
    expect(calls).toContainEqual(['eq', 'risk', 'Critical']);

    const body = await res.text();
    const lines = body.split('\r\n');
    expect(lines[0]).toBe('"filename","scanned_at","detector","risk","occurrences","masked_example"');
    expect(lines[1]).toBe(
      `"'=HYPERLINK(""http://x"")","2026-10-21T06:00:00.000Z","payment_card","Critical","1","************1111"`,
    );
  });

  it('ignores invalid filter values instead of passing them to the database', async () => {
    const res = await GET(new Request('http://localhost/api/export?detector=bogus&risk=%27%3B--'));
    expect(res.status).toBe(200);
    expect(calls.filter((c) => c[0] === 'eq')).toEqual([]);
  });

  it('pages past the 1000-row PostgREST cap', async () => {
    pages = [Array.from({ length: 1000 }, (_, i) => dbRow(i)), [dbRow(1000), dbRow(1001)]];
    const res = await GET(new Request('http://localhost/api/export'));
    const body = await res.text();
    expect(body.trim().split('\r\n')).toHaveLength(1 + 1002);
    expect(calls.filter((c) => c[0] === 'range')).toEqual([
      ['range', 0, 999],
      ['range', 1000, 1999],
    ]);
  });

  it('returns 500 with a generic message on a DB error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryError = { code: '42501' };
    const res = await GET(new Request('http://localhost/api/export'));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('export_failed');
    spy.mockRestore();
  });
});
