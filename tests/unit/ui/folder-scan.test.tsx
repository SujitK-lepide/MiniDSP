import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FolderScan } from '@/app/upload/folder-scan';
import { planFolderScan } from '@/lib/upload/folder';

afterEach(() => vi.unstubAllGlobals());

/** A File as a directory picker produces it (webkitRelativePath set). */
function inFolder(path: string, content: BlobPart = 'synthetic') {
  const name = path.split('/').pop()!;
  const file = new File([content], name, { type: 'text/plain' });
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

describe('planFolderScan', () => {
  it('keeps only .csv/.txt (case-insensitive), sorted by path, and lists the rest as skipped', () => {
    const { toScan, skipped } = planFolderScan([
      inFolder('data/b.TXT'),
      inFolder('data/sub/a.csv'),
      inFolder('data/notes.json'),
      inFolder('data/.DS_Store'),
      inFolder('data/a.txt'),
    ]);
    expect(toScan.map((e) => e.path)).toEqual(['data/a.txt', 'data/b.TXT', 'data/sub/a.csv']);
    expect(skipped).toEqual([
      { path: 'data/.DS_Store', reason: 'Not a .csv or .txt file' },
      { path: 'data/notes.json', reason: 'Not a .csv or .txt file' },
    ]);
  });

  it('caps the number of files and reports the overflow as skipped', () => {
    const files = Array.from({ length: 5 }, (_, i) => inFolder(`d/f${i}.txt`));
    const { toScan, skipped } = planFolderScan(files, 3);
    expect(toScan).toHaveLength(3);
    expect(skipped.map((s) => s.path)).toEqual(['d/f3.txt', 'd/f4.txt']);
    expect(skipped[0].reason).toMatch(/3-file limit/);
  });
});

describe('FolderScan', () => {
  it('offers a "Select folder" button that opens the hidden folder picker and shows the chosen folder', async () => {
    render(<FolderScan />);
    const input = screen.getByLabelText('Folder') as HTMLInputElement;
    expect(input).toHaveAttribute('webkitdirectory');
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('folder-name')).toHaveTextContent('No folder selected');
    expect(screen.queryByText(/Choose Files/i)).toBeNull();

    const click = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Select folder' }));
    expect(click).toHaveBeenCalledOnce();

    await userEvent.upload(input, [inFolder('Q3-exports/a.csv'), inFolder('Q3-exports/sub/b.txt'), inFolder('Q3-exports/c.png')]);
    expect(screen.getByTestId('folder-name')).toHaveTextContent('Q3-exports (3 files)');
  });

  it('uploads each supported file separately and summarises the results', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const file = (init.body as FormData).get('file') as File;
      if (file.name === 'empty.txt') {
        return new Response(JSON.stringify({ error: { code: 'empty', message: 'The file is empty.' } }), { status: 400 });
      }
      const critical = file.name === 'cards.csv';
      return new Response(
        JSON.stringify({
          scanId: `id-${file.name}`,
          risk: critical ? 'Critical' : 'None',
          findings: critical ? [{ detector: 'payment_card', risk: 'Critical', occurrences: 2, maskedExample: '************1111' }] : [],
        }),
        { status: 201 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<FolderScan />);
    const input = screen.getByLabelText('Folder');
    expect(input).toHaveAttribute('webkitdirectory');
    await userEvent.upload(input, [
      inFolder('batch/cards.csv'),
      inFolder('batch/clean.txt'),
      inFolder('batch/empty.txt', ''),
      inFolder('batch/image.png'),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('3 files to scan, 1 skipped.');

    await userEvent.click(screen.getByRole('button', { name: 'Scan 3 files' }));
    const table = await screen.findByRole('table', { name: 'Folder scan results' });
    await within(table).findByText('batch/empty.txt');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/scan')).toBe(true);
    expect(screen.getByText(/scanned, .* rejected/)).toHaveTextContent('2 scanned, 1 rejected, 1 skipped.');

    const row = (path: string) => within(table).getByText(path).closest('tr')!;
    expect(within(row('batch/cards.csv')).getByText('Scanned')).toBeInTheDocument();
    expect(within(row('batch/cards.csv')).getByText('Critical')).toBeInTheDocument();
    expect(within(row('batch/cards.csv')).getByText('Payment card ×2 (************1111)')).toBeInTheDocument();
    expect(within(row('batch/clean.txt')).getByText('No sensitive data found')).toBeInTheDocument();
    expect(within(row('batch/empty.txt')).getByText('Rejected')).toBeInTheDocument();
    expect(within(row('batch/empty.txt')).getByText('The file is empty.')).toBeInTheDocument();
    expect(within(row('batch/image.png')).getByText('Skipped')).toBeInTheDocument();
  });

  it('stops and explains when the session expires mid-scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    render(<FolderScan />);
    await userEvent.upload(screen.getByLabelText('Folder'), [inFolder('x/a.txt'), inFolder('x/b.txt')]);
    await userEvent.click(screen.getByRole('button', { name: 'Scan 2 files' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('session has expired');
  });
});
