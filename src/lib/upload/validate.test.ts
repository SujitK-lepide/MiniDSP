// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
  validateUpload,
  type UploadLike,
} from './validate';

const fixtures = join(process.cwd(), 'tests', 'fixtures', 'additional');
const fixtureFile = (name: string) => new File([readFileSync(join(fixtures, name))], name);
const bytesFile = (bytes: number[] | Uint8Array, name = 'data.txt') => new File([new Uint8Array(bytes)], name);

/** A file whose declared size/name we control, with a spy to prove content wasn't read. */
const fakeFile = (name: string, size: number, content = new Uint8Array([0x61])) => {
  const arrayBuffer = vi.fn(async () => content.buffer.slice(0) as ArrayBuffer);
  const file: UploadLike = { name, size, arrayBuffer };
  return { file, arrayBuffer };
};

describe('validateUpload — fixtures 28/29/30', () => {
  it('28_empty.txt → empty (400)', async () => {
    const r = await validateUpload(fixtureFile('28_empty.txt'));
    expect(r).toMatchObject({ ok: false, error: { code: 'empty', status: 400 } });
  });

  it('29_unsupported.json → unsupported_type (415)', async () => {
    const r = await validateUpload(fixtureFile('29_unsupported.json'));
    expect(r).toMatchObject({ ok: false, error: { code: 'unsupported_type', status: 415 } });
  });

  it('30_oversized.txt → too_large (413)', async () => {
    const r = await validateUpload(fixtureFile('30_oversized.txt'));
    expect(r).toMatchObject({ ok: false, error: { code: 'too_large', status: 413 } });
  });
});

describe('validateUpload — checks size and type before reading content', () => {
  it.each([
    ['unsupported extension', 'notes.json', 10, 'unsupported_type'],
    ['declared size 0', 'notes.txt', 0, 'empty'],
    ['declared size > 1 MiB', 'notes.txt', MAX_UPLOAD_BYTES + 1, 'too_large'],
  ])('%s → %s without calling arrayBuffer()', async (_label, name, size, code) => {
    const { file, arrayBuffer } = fakeFile(name, size);
    const r = await validateUpload(file);
    expect(r).toMatchObject({ ok: false, error: { code } });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('re-checks the real byte length when the declared size lies', async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0x61);
    const { file, arrayBuffer } = fakeFile('notes.txt', 10, big);
    const r = await validateUpload(file);
    expect(arrayBuffer).toHaveBeenCalledOnce();
    expect(r).toMatchObject({ ok: false, error: { code: 'too_large' } });
  });

  it('accepts exactly 1 MiB', async () => {
    const r = await validateUpload(bytesFile(new Uint8Array(MAX_UPLOAD_BYTES).fill(0x61)));
    expect(r.ok).toBe(true);
  });
});

describe('validateUpload — content', () => {
  it('rejects invalid UTF-8 bytes', async () => {
    const r = await validateUpload(bytesFile([0x68, 0x69, 0xc3, 0x28]));
    expect(r).toMatchObject({ ok: false, error: { code: 'invalid_utf8' } });
  });

  it('rejects a NUL byte as binary', async () => {
    const r = await validateUpload(bytesFile([0x68, 0x00, 0x69]));
    expect(r).toMatchObject({ ok: false, error: { code: 'binary' } });
  });

  it.each([0x01, 0x07, 0x08, 0x0b, 0x0c, 0x1b, 0x7f])('rejects control byte 0x%s', async (b) => {
    const r = await validateUpload(bytesFile([0x61, b, 0x62]));
    expect(r).toMatchObject({ ok: false, error: { code: 'binary' } });
  });

  it('rejects C1 control characters (valid UTF-8 encoding)', async () => {
    const r = await validateUpload(bytesFile([0x61, 0xc2, 0x85, 0x62]));
    expect(r).toMatchObject({ ok: false, error: { code: 'binary' } });
  });

  it('accepts a valid file with \\t \\r \\n and Unicode, and strips the BOM', async () => {
    const content = '\uFEFFname,city\r\nZoë\tMünchen\n';
    const r = await validateUpload(new File([content], 'People.CSV'));
    expect(r).toEqual({
      ok: true,
      filename: 'People.CSV',
      sizeBytes: new TextEncoder().encode(content).byteLength,
      text: 'name,city\r\nZoë\tMünchen\n',
    });
  });

  it('accepts a valid fixture (03_one_email.txt)', async () => {
    const r = await validateUpload(fixtureFile('03_one_email.txt'));
    expect(r.ok).toBe(true);
  });

  it('a BOM-only file is treated as empty', async () => {
    const r = await validateUpload(bytesFile([0xef, 0xbb, 0xbf]));
    expect(r).toMatchObject({ ok: false, error: { code: 'empty' } });
  });

  it('missing file → missing_file', async () => {
    expect(await validateUpload(null)).toMatchObject({ ok: false, error: { code: 'missing_file' } });
  });

  it('error messages never echo file contents', async () => {
    const secret = 'alex@example.test\u0000';
    const r = await validateUpload(new File([secret], 'x.txt'));
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain('alex@example.test');
  });
});

describe('sanitizeFilename', () => {
  it('keeps the basename only', () => {
    expect(sanitizeFilename('../../etc/passwd.txt')).toBe('passwd.txt');
    expect(sanitizeFilename('C:\\Users\\me\\report.csv')).toBe('report.csv');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('rep\u0000ort\r\n.csv')).toBe('report.csv');
  });

  it('limits to 255 characters and keeps the extension', () => {
    const s = sanitizeFilename(`${'a'.repeat(400)}.csv`);
    expect(s).toHaveLength(MAX_FILENAME_LENGTH);
    expect(s.endsWith('.csv')).toBe(true);
  });

  it('rejects names that become empty, and double extensions ending in non-csv/txt', async () => {
    expect(await validateUpload(new File(['a'], '\u0000\u0001'))).toMatchObject({
      ok: false,
      error: { code: 'invalid_filename' },
    });
    expect(await validateUpload(new File(['a'], 'data.txt.exe'))).toMatchObject({
      ok: false,
      error: { code: 'unsupported_type' },
    });
  });
});
