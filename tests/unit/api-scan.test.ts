// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const getUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}));

const { POST } = await import('@/app/api/scan/route');

const fixtures = join(process.cwd(), 'tests', 'fixtures', 'additional');

const RAW_VALUES = ['alex@example.test', '07700 900123', 'AB 12 34 56 C', '4111 1111 1111 1111'];

function upload(file: File | string | null) {
  const form = new FormData();
  if (file !== null) form.append('file', file);
  return new Request('http://localhost/api/scan', { method: 'POST', body: form });
}

const fixture = (name: string) => new File([readFileSync(join(fixtures, name))], name);

beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
  rpc.mockResolvedValue({ data: '00000000-0000-4000-8000-000000000001', error: null });
});

describe('POST /api/scan — auth', () => {
  it('returns 401 and makes no DB call when not signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(upload(new File(['hello'], 'a.txt')));
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('POST /api/scan — invalid uploads make NO database call', () => {
  it.each([
    ['28_empty.txt', 400, 'empty'],
    ['29_unsupported.json', 415, 'unsupported_type'],
    ['30_oversized.txt', 413, 'too_large'],
  ])('%s → %i %s', async (name, status, code) => {
    const res = await POST(upload(fixture(name)));
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['binary (NUL)', new File([new Uint8Array([0x61, 0x00, 0x62])], 'a.txt'), 'binary'],
    ['invalid UTF-8', new File([new Uint8Array([0xc3, 0x28])], 'a.txt'), 'invalid_utf8'],
  ])('%s → 400', async (_label, file, code) => {
    const res = await POST(upload(file));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(code);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('missing file field → 400 missing_file', async () => {
    const res = await POST(upload(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('missing_file');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('string instead of file → 400', async () => {
    const res = await POST(upload('alex@example.test'));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('non-multipart body → 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/scan', { method: 'POST', body: 'x', headers: { 'content-type': 'text/plain' } }),
    );
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('Content-Length far above the limit → 413 before reading the body', async () => {
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: 'x',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(50 * 1024 * 1024) },
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('POST /api/scan — valid upload', () => {
  it('sends only masked values to save_scan and returns the scan', async () => {
    const content = RAW_VALUES.join(', ') + '\nalex@example.test\n';
    const res = await POST(upload(new File([content], 'mixed.csv')));
    expect(res.status).toBe(201);

    expect(rpc).toHaveBeenCalledOnce();
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('save_scan');
    expect(args).toEqual({
      p_filename: 'mixed.csv',
      p_size_bytes: new TextEncoder().encode(content).byteLength,
      p_risk: 'Critical',
      p_findings: [
        { detector: 'payment_card', risk: 'Critical', occurrences: 1, masked_example: '************1111' },
        { detector: 'uk_nino', risk: 'High', occurrences: 1, masked_example: 'AB******C' },
        { detector: 'uk_phone', risk: 'Medium', occurrences: 1, masked_example: '07******123' },
        { detector: 'email', risk: 'Low', occurrences: 2, masked_example: 'a***@example.test' },
      ],
    });

    const payload = JSON.stringify(args);
    const body = await res.json();
    for (const raw of RAW_VALUES) {
      expect(payload).not.toContain(raw);
      expect(payload).not.toContain(raw.replace(/\s/g, ''));
      expect(JSON.stringify(body)).not.toContain(raw);
    }
    expect(body.scanId).toBe('00000000-0000-4000-8000-000000000001');
    expect(body.risk).toBe('Critical');
    expect(body.findings).toHaveLength(4);
  });

  it('22_all_four.csv → Critical, payload masked', async () => {
    const res = await POST(upload(fixture('22_all_four.csv')));
    expect(res.status).toBe(201);
    const args = rpc.mock.calls[0][1];
    expect(args.p_risk).toBe('Critical');
    const raw = readFileSync(join(fixtures, '22_all_four.csv'), 'utf8');
    // No line of the original file (other than the header) appears verbatim in the payload.
    for (const line of raw.split(/\r?\n/).slice(1).filter(Boolean)) {
      expect(JSON.stringify(args)).not.toContain(line);
    }
  });

  it('save_scan error → 500 with a generic message and no content in logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code: '22P02', message: 'invalid input value' } });
    const res = await POST(upload(new File(['alex@example.test'], 'a.txt')));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('save_failed');
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('alex@example.test');
    errorSpy.mockRestore();
  });
});
