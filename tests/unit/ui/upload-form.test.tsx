import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UploadForm, fileHint } from '@/app/upload/upload-form';

afterEach(() => vi.unstubAllGlobals());

describe('fileHint (client-side hint only)', () => {
  it('flags unsupported, empty and oversized files', () => {
    expect(fileHint({ name: 'a.json', size: 10 })).toMatch(/Only \.csv and \.txt/);
    expect(fileHint({ name: 'a.txt', size: 0 })).toMatch(/empty/);
    expect(fileHint({ name: 'a.txt', size: 1_048_577 })).toMatch(/larger than 1 MiB/);
    expect(fileHint({ name: 'a.CSV', size: 10 })).toBeNull();
  });
});

describe('UploadForm', () => {
  it('shows the risk badge and masked findings returned by the server', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          scanId: 'id-1',
          risk: 'Critical',
          findings: [
            { detector: 'payment_card', risk: 'Critical', occurrences: 1, maskedExample: '************1111' },
            { detector: 'email', risk: 'Low', occurrences: 2, maskedExample: 'a***@example.test' },
          ],
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<UploadForm />);
    await userEvent.upload(screen.getByLabelText('File'), new File(['synthetic'], 'mixed.csv', { type: 'text/csv' }));
    await userEvent.click(screen.getByRole('button', { name: 'Scan file' }));

    expect(await screen.findByRole('heading', { name: 'Scan result' })).toBeInTheDocument();
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getByText('************1111')).toBeInTheDocument();
    expect(screen.getByText('a***@example.test')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/scan', expect.objectContaining({ method: 'POST' }));
  });

  it('still submits an oversized file (server is the authority) and shows its rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: 'too_large', message: 'The file is larger than 1 MiB (1,048,576 bytes).' } }), {
          status: 413,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    render(<UploadForm />);
    const big = new File([new Uint8Array(1_048_577)], 'big.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText('File'), big);
    expect(screen.getByText(/The server will reject it/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Scan file' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Upload rejected');
    expect(alert).toHaveTextContent('larger than 1 MiB');
  });

  it('asks for a file when none is chosen', async () => {
    render(<UploadForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Scan file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a .csv or .txt file');
  });
});
