'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { LpMessage } from '@/components/lp-message';
import { ScanResultCard, type ScanResult } from '@/components/scan-result';
import { Spinner } from '@/components/spinner';
import { ALLOWED_EXTENSION, MAX_UPLOAD_BYTES } from '@/lib/upload/limits';

type State =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; filename: string; result: ScanResult }
  | { status: 'error'; message: string };

/** Client-side hint only — the server re-validates everything and is the authority. */
export function fileHint(file: { name: string; size: number } | null): string | null {
  if (!file) return null;
  if (!ALLOWED_EXTENSION.test(file.name)) return 'Only .csv and .txt files are accepted. The server will reject this file.';
  if (file.size === 0) return 'This file is empty. The server will reject it.';
  if (file.size > MAX_UPLOAD_BYTES) return 'This file is larger than 1 MiB. The server will reject it.';
  return null;
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ status: 'idle' });
  const hint = fileHint(file);
  const uploading = state.status === 'uploading';

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setState({ status: 'idle' });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setState({ status: 'error', message: 'Choose a .csv or .txt file to scan.' });
      return;
    }
    setState({ status: 'uploading' });
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/scan', { method: 'POST', body });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.scanId) {
        setState({ status: 'done', filename: file.name, result: json as ScanResult });
      } else if (res.status === 401) {
        setState({ status: 'error', message: 'Your session has expired. Sign in again to upload.' });
      } else {
        setState({ status: 'error', message: json?.error?.message ?? 'The file could not be scanned. Try again.' });
      }
    } catch {
      setState({ status: 'error', message: 'The upload did not reach the server. Check your connection and try again.' });
    }
  };

  return (
    <div className="stack">
      <section className="lp-card" aria-labelledby="upload-title">
        <div className="lp-card__header">
          <div className="lp-card__title">
            <h2 className="heading-reset" id="upload-title">
              Choose a file
            </h2>
          </div>
        </div>
        <div className="lp-card__body">
          <form className="form-stack" onSubmit={onSubmit} noValidate>
            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="upload-file">
                  File
                </label>
                <div className={hint ? 'lp-input__field lp-input__field--error' : 'lp-input__field'}>
                  <input
                    className="lp-input__input"
                    id="upload-file"
                    name="file"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={onFileChange}
                    aria-invalid={hint ? true : undefined}
                    aria-describedby="upload-file-msg"
                    disabled={uploading}
                  />
                </div>
              </div>
              <div
                id="upload-file-msg"
                className={hint ? 'lp-input__message lp-input__message--error' : 'lp-input__message'}
              >
                {hint ?? 'CSV or TXT, UTF-8 text, 1 byte to 1 MiB. Use synthetic data only.'}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="lp-button lp-button--primary lp-button--md" disabled={uploading}>
                {uploading ? 'Scanning…' : 'Scan file'}
              </button>
              {uploading ? (
                <span className="inline-status">
                  <Spinner label="Scanning file" /> Scanning file…
                </span>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      {state.status === 'error' ? (
        <LpMessage variant="error" title="Upload rejected">
          {state.message}
        </LpMessage>
      ) : null}

      {state.status === 'done' ? <ScanResultCard filename={state.filename} result={state.result} /> : null}
    </div>
  );
}
