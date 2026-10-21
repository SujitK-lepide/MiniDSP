'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { LpMessage } from '@/components/lp-message';
import { EmptyRow, LpTable, Td, Th } from '@/components/lp-table';
import { RiskBadge } from '@/components/risk-badge';
import type { ScanResult } from '@/components/scan-result';
import { Spinner } from '@/components/spinner';
import { maxRisk } from '@/lib/detectors/classify';
import { DETECTOR_LABELS, formatCount } from '@/lib/ui/labels';
import { FOLDER_MAX_FILES, planFolderScan, type FolderEntry, type SkippedEntry } from '@/lib/upload/folder';

type Outcome =
  | { path: string; status: 'scanned'; result: ScanResult }
  | { path: string; status: 'rejected'; message: string };

type Phase = 'idle' | 'scanning' | 'done' | 'stopped';

const findingsTotal = (r: ScanResult) => r.findings.reduce((n, f) => n + f.occurrences, 0);

/** Scans every .csv/.txt file in a chosen folder, one POST /api/scan per file (server validates each). */
export function FolderScan() {
  const [toScan, setToScan] = useState<FolderEntry[]>([]);
  const [skipped, setSkipped] = useState<SkippedEntry[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fatal, setFatal] = useState<string | null>(null);
  const stopRef = useRef<AbortController | null>(null);

  const scanning = phase === 'scanning';

  const onFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const plan = planFolderScan(Array.from(e.target.files ?? []));
    setToScan(plan.toScan);
    setSkipped(plan.skipped);
    setOutcomes([]);
    setFatal(null);
    setPhase('idle');
  };

  const run = async () => {
    const controller = new AbortController();
    stopRef.current = controller;
    setOutcomes([]);
    setFatal(null);
    setPhase('scanning');

    for (const { file, path } of toScan) {
      if (controller.signal.aborted) break;
      const body = new FormData();
      body.append('file', file);
      let outcome: Outcome;
      try {
        const res = await fetch('/api/scan', { method: 'POST', body, signal: controller.signal });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          setFatal('Your session has expired. Sign in again, then rescan the folder.');
          setPhase('stopped');
          return;
        }
        outcome =
          res.ok && json?.scanId
            ? { path, status: 'scanned', result: json as ScanResult }
            : { path, status: 'rejected', message: json?.error?.message ?? 'The file could not be scanned.' };
      } catch {
        if (controller.signal.aborted) break;
        outcome = { path, status: 'rejected', message: 'The upload did not reach the server.' };
      }
      setOutcomes((prev) => [...prev, outcome]);
    }
    setPhase(controller.signal.aborted ? 'stopped' : 'done');
  };

  const scanned = outcomes.filter((o): o is Extract<Outcome, { status: 'scanned' }> => o.status === 'scanned');
  const rejected = outcomes.length - scanned.length;
  const highest = maxRisk(scanned.map((o) => o.result.risk));

  return (
    <section className="lp-card" aria-labelledby="folder-title">
      <div className="lp-card__header">
        <div className="lp-card__title">
          <h2 className="heading-reset" id="folder-title">
            Scan a folder
          </h2>
        </div>
      </div>
      <div className="lp-card__body stack--tight">
        <div className="lp-input lp-input--full-width">
          <div className="lp-input__row lp-input__row--label-top">
            <label className="lp-input__label" htmlFor="upload-folder">
              Folder
            </label>
            <div className="lp-input__field">
              <input
                className="lp-input__input"
                id="upload-folder"
                name="folder"
                type="file"
                multiple
                {...{ webkitdirectory: '', directory: '' }}
                onChange={onFolderChange}
                aria-describedby="upload-folder-msg"
                disabled={scanning}
              />
            </div>
          </div>
          <div id="upload-folder-msg" className="lp-input__message">
            Every .csv and .txt file in the folder and its subfolders is scanned separately (up to {FOLDER_MAX_FILES} files,
            1 MiB each). Other files are skipped. Only file contents are uploaded, never the folder itself.
          </div>
        </div>

        {toScan.length + skipped.length > 0 ? (
          <p className="muted" role="status">
            {formatCount(toScan.length)} {toScan.length === 1 ? 'file' : 'files'} to scan, {formatCount(skipped.length)} skipped.
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="button"
            className="lp-button lp-button--primary lp-button--md"
            onClick={run}
            disabled={scanning || toScan.length === 0}
          >
            {toScan.length > 0 ? `Scan ${formatCount(toScan.length)} ${toScan.length === 1 ? 'file' : 'files'}` : 'Scan folder'}
          </button>
          {scanning ? (
            <>
              <button type="button" className="lp-button lp-button--secondary lp-button--md" onClick={() => stopRef.current?.abort()}>
                Stop
              </button>
              <span className="inline-status">
                <Spinner label="Scanning folder" /> Scanning {formatCount(Math.min(outcomes.length + 1, toScan.length))} of{' '}
                {formatCount(toScan.length)}…
              </span>
            </>
          ) : null}
        </div>

        {fatal ? (
          <LpMessage variant="error" title="Folder scan stopped">
            {fatal}
          </LpMessage>
        ) : null}

        {phase === 'done' || phase === 'stopped' || outcomes.length > 0 ? (
          <div className="stack--tight" aria-live="polite">
            <p className="page-intro">
              {phase === 'stopped' ? 'Stopped. ' : null}
              {formatCount(scanned.length)} scanned, {formatCount(rejected)} rejected, {formatCount(skipped.length)} skipped.{' '}
              {scanned.length > 0 ? (
                <>
                  <span className="muted">Highest risk:</span> <RiskBadge risk={highest} />
                </>
              ) : null}
            </p>
            <LpTable
              caption="Folder scan results"
              head={
                <>
                  <Th>File</Th>
                  <Th>Status</Th>
                  <Th>Risk</Th>
                  <Th>Findings</Th>
                  <Th>Details</Th>
                </>
              }
            >
              {outcomes.length === 0 && skipped.length === 0 ? (
                <EmptyRow colSpan={5}>
                  <p className="muted">No files were scanned.</p>
                </EmptyRow>
              ) : null}
              {outcomes.map((o) => (
                <tr key={`o-${o.path}`}>
                  <Td>{o.path}</Td>
                  <Td>
                    {o.status === 'scanned' ? (
                      <span className="lp-badge lp-badge--success">Scanned</span>
                    ) : (
                      <span className="lp-badge lp-badge--error">Rejected</span>
                    )}
                  </Td>
                  <Td>{o.status === 'scanned' ? <RiskBadge risk={o.result.risk} /> : '-'}</Td>
                  <Td>{o.status === 'scanned' ? formatCount(findingsTotal(o.result)) : '-'}</Td>
                  <Td>
                    {o.status === 'rejected'
                      ? o.message
                      : o.result.findings.length === 0
                        ? 'No sensitive data found'
                        : o.result.findings
                            .map((f) => `${DETECTOR_LABELS[f.detector]} ×${f.occurrences} (${f.maskedExample})`)
                            .join('; ')}
                  </Td>
                </tr>
              ))}
              {skipped.map((s) => (
                <tr key={`s-${s.path}`}>
                  <Td>{s.path}</Td>
                  <Td>
                    <span className="lp-badge lp-badge--neutral">Skipped</span>
                  </Td>
                  <Td>-</Td>
                  <Td>-</Td>
                  <Td>{s.reason}</Td>
                </tr>
              ))}
            </LpTable>
            {scanned.length > 0 ? (
              <div>
                <a className="lp-link lp-link--standalone" href="/findings">
                  View all findings
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
