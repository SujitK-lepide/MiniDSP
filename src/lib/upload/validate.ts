import { ALLOWED_EXTENSION, MAX_FILENAME_LENGTH, MAX_UPLOAD_BYTES, MIN_UPLOAD_BYTES } from './limits';

export { MAX_FILENAME_LENGTH, MAX_UPLOAD_BYTES, MIN_UPLOAD_BYTES } from './limits';

export type UploadErrorCode =
  | 'missing_file'
  | 'invalid_filename'
  | 'unsupported_type'
  | 'empty'
  | 'too_large'
  | 'binary'
  | 'invalid_utf8';

export type UploadError = {
  code: UploadErrorCode;
  status: 400 | 413 | 415;
  /** Safe, generic message. Never contains file contents. */
  message: string;
};

export type ValidUpload = {
  ok: true;
  filename: string;
  sizeBytes: number;
  text: string;
};

export type UploadValidationResult = ValidUpload | { ok: false; error: UploadError };

/** Minimal shape of a Web `File`. */
export type UploadLike = {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

const ERRORS: Record<UploadErrorCode, UploadError> = {
  missing_file: { code: 'missing_file', status: 400, message: 'No file was uploaded.' },
  invalid_filename: { code: 'invalid_filename', status: 400, message: 'The file name is not valid.' },
  unsupported_type: {
    code: 'unsupported_type',
    status: 415,
    message: 'Unsupported file type. Upload a .csv or .txt file.',
  },
  empty: { code: 'empty', status: 400, message: 'The file is empty.' },
  too_large: { code: 'too_large', status: 413, message: 'The file is larger than 1 MiB (1,048,576 bytes).' },
  binary: { code: 'binary', status: 400, message: 'The file appears to be binary, not plain text.' },
  invalid_utf8: { code: 'invalid_utf8', status: 400, message: 'The file is not valid UTF-8 text.' },
};

const fail = (code: UploadErrorCode): UploadValidationResult => ({ ok: false, error: ERRORS[code] });

// C0 controls, DEL and C1 controls.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Basename only, control characters removed, trimmed, at most 255 characters (extension kept). */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const clean = base.replace(CONTROL_CHARS, '').trim();
  if (clean.length <= MAX_FILENAME_LENGTH) return clean;
  const dot = clean.lastIndexOf('.');
  const ext = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : '';
  return clean.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
}

const sizeError = (n: number): UploadErrorCode | null =>
  n < MIN_UPLOAD_BYTES ? 'empty' : n > MAX_UPLOAD_BYTES ? 'too_large' : null;

/** Bytes 0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F and 0x7F (everything in C0/DEL except \t \n \r). */
function hasBinaryBytes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) || b === 0x7f) return true;
  }
  return false;
}

/**
 * Server-side upload validation. Checks name and declared size before reading,
 * then re-checks the real byte length, rejects binary content and invalid UTF-8,
 * and strips a leading BOM.
 */
export async function validateUpload(file: UploadLike | null | undefined): Promise<UploadValidationResult> {
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    return fail('missing_file');
  }

  const filename = sanitizeFilename(String(file.name ?? ''));
  if (!filename) return fail('invalid_filename');
  if (!ALLOWED_EXTENSION.test(filename)) return fail('unsupported_type');

  const declared = sizeError(file.size);
  if (declared) return fail(declared);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const actual = sizeError(bytes.byteLength);
  if (actual) return fail(actual);

  if (hasBinaryBytes(bytes)) return fail('binary');

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail('invalid_utf8');
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // C1 controls only become visible after decoding.
  if (/[\u0080-\u009f]/.test(text)) return fail('binary');
  if (text.length === 0) return fail('empty');

  return { ok: true, filename, sizeBytes: bytes.byteLength, text };
}
