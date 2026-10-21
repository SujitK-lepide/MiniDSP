import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth/session';
import { FolderScan } from './folder-scan';
import { UploadForm } from './upload-form';

export default async function UploadPage() {
  const { user } = await requireUser('/upload');
  return (
    <AppShell
      active="upload"
      title="Upload"
      intro="Scan synthetic CSV or TXT files (up to 1 MiB each) for email addresses, UK phone numbers, UK National Insurance numbers and payment cards — one file, or every file in a folder."
      email={user.email}
    >
      <div className="stack">
        <UploadForm />
        <FolderScan />
      </div>
    </AppShell>
  );
}
