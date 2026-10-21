import { NextResponse } from 'next/server';
import { scanText } from '@/lib/detectors';
import { getApiUser } from '@/lib/auth/session';
import { MAX_UPLOAD_BYTES, validateUpload } from '@/lib/upload/validate';

export const runtime = 'nodejs';

// Multipart overhead allowance on top of the 1 MiB file limit.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

type ApiError = { code: string; message: string };

const errorResponse = (status: number, error: ApiError) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

const TOO_LARGE: ApiError = { code: 'too_large', message: 'The file is larger than 1 MiB (1,048,576 bytes).' };
const BAD_REQUEST: ApiError = { code: 'invalid_request', message: 'Send the file as multipart/form-data in a "file" field.' };

/** Reads the body but stops (returns null) as soon as it exceeds `limit` bytes. */
async function readBodyCapped(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (!auth) return errorResponse(401, { code: 'unauthorized', message: 'Sign in required.' });

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return errorResponse(400, BAD_REQUEST);

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return errorResponse(413, TOO_LARGE);

  const body = await readBodyCapped(request, MAX_BODY_BYTES);
  if (!body) return errorResponse(413, TOO_LARGE);

  let form: FormData;
  try {
    form = await new Response(body as BodyInit, { headers: { 'content-type': contentType } }).formData();
  } catch {
    return errorResponse(400, BAD_REQUEST);
  }

  const entry = form.get('file');
  const result = await validateUpload(entry && typeof entry !== 'string' ? entry : null);
  if (!result.ok) {
    return errorResponse(result.error.status, { code: result.error.code, message: result.error.message });
  }

  // In-memory only; the decoded text is never logged or stored and is dropped after this call.
  const scan = scanText(result.text);

  const { data: scanId, error } = await auth.supabase.rpc('save_scan', {
    p_filename: result.filename,
    p_size_bytes: result.sizeBytes,
    p_risk: scan.risk,
    p_findings: scan.findings.map((f) => ({
      detector: f.detector,
      risk: f.risk,
      occurrences: f.occurrences,
      masked_example: f.maskedExample,
    })),
  });

  if (error || typeof scanId !== 'string') {
    console.error('save_scan failed', { code: error?.code ?? 'no_id' });
    return errorResponse(500, { code: 'save_failed', message: 'The scan could not be saved. Please try again.' });
  }

  return NextResponse.json(
    { scanId, risk: scan.risk, findings: scan.findings },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
