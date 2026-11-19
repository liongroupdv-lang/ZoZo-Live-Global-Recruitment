import { Check, Copy, Download, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildZoZoBackendScript } from '../data/appsScript';
import type { AdminPermissionLevel, BackendConfig } from '../types/recruitment';

interface BackendSetupPanelProps {
  config: BackendConfig;
  actorRole: AdminPermissionLevel;
  publicOrigin: string;
  onSaveConfig: (next: Partial<BackendConfig>) => Promise<void>;
  onTestConnection: (webAppUrl: string) => Promise<void>;
}

export function BackendSetupPanel({
  config,
  actorRole,
  publicOrigin,
  onSaveConfig,
  onTestConnection,
}: BackendSetupPanelProps) {
  const [webAppUrl, setWebAppUrl] = useState(config.appsScriptWebAppUrl);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl);
  const [driveCvFolderUrl, setDriveCvFolderUrl] = useState(config.driveCvFolderUrl);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isOwner = actorRole === 'Owner';
  const publicApplicationLink = `${publicOrigin}/`;
  const privateAdminLink = `${publicOrigin}/admin`;

  const scriptCode = useMemo(
    () =>
      buildZoZoBackendScript({
        ownerEmail: config.ownerEmail,
        adminDashboardUrl: privateAdminLink,
      }),
    [config.ownerEmail, privateAdminLink]
  );

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ZoZoRecruitmentBackend.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await onSaveConfig({
        appsScriptWebAppUrl: webAppUrl.trim(),
        spreadsheetUrl: spreadsheetUrl.trim(),
        driveCvFolderUrl: driveCvFolderUrl.trim(),
      });
      setNotice('Saved Google Apps Script & Google Sheets configuration.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setNotice('');
    setTesting(true);
    try {
      await onTestConnection(webAppUrl.trim());
      setNotice(
        'Verified! Google Apps Script Web App responded and synced your Private Spreadsheet & CV Drive Folder URLs.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend verification failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Google Apps Script &amp; Private Sheets Backend
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect your private Google Spreadsheet, private Drive CV folder, and MailApp instant email
          notifications under <span className="font-mono text-slate-900">{config.ownerEmail}</span>.
        </p>
      </div>

      {/* Official Two Separate Links + Private Google Sheet Link */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'public',
            label: '1. Public Application Link',
            hint: 'Share worldwide (no Google sign-in required)',
            url: publicApplicationLink,
          },
          {
            key: 'admin',
            label: '2. Private Admin Dashboard Link',
            hint: 'Authorized administrators only',
            url: privateAdminLink,
          },
          {
            key: 'sheet',
            label: '3. Private Google Sheets Link',
            hint: 'Owner & authorized admins only',
            url: config.spreadsheetUrl || spreadsheetUrl || '',
          },
        ].map((item) => (
          <div
            key={item.key}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2"
          >
            <div>
              <div className="text-xs font-bold text-slate-900">{item.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.hint}</div>
            </div>
            {item.url ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[#4F46E5] hover:underline truncate"
                  >
                    {item.url}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.key, item.url)}
                    aria-label={`Copy ${item.label}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer shrink-0"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                {item.key === 'public' && (
                  <div className="flex items-center gap-3 text-[11px]">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Apply for ZoZo Live Official Global Recruitment: ${item.url}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      Share on WhatsApp
                    </a>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(item.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-semibold hover:underline"
                    >
                      Share on Facebook
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Run <span className="font-mono">setupZoZoRecruitmentDatabase</span> in Apps Script
                and verify below to populate your private Sheet link.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Connect Deployed Web App URL */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Web App Connection Settings
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Status:{' '}
              <span
                className={`font-semibold ${
                  config.appsScriptWebAppUrl ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {config.appsScriptWebAppUrl
                  ? 'Connected (Syncing submissions, Drive CVs & MailApp)'
                  : 'Pending Apps Script Web App URL (Local Private Storage Active)'}
              </span>
            </p>
          </div>
          {config.driveCvFolderUrl && (
            <a
              href={config.driveCvFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4C1D95] bg-violet-50 border border-violet-200 rounded-lg whitespace-nowrap"
            >
              <span>Open Private CV Folder</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Apps Script Web App URL (ends with /exec)
            </label>
            <input
              type="url"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              disabled={!isOwner}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:border-[#4C1D95]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Private Google Spreadsheet URL
            </label>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              disabled={!isOwner}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:border-[#4C1D95]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Private Google Drive CV Folder URL
            </label>
            <input
              type="url"
              value={driveCvFolderUrl}
              onChange={(e) => setDriveCvFolderUrl(e.target.value)}
              disabled={!isOwner}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:border-[#4C1D95]"
            />
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save URLs'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !webAppUrl.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] disabled:opacity-50 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Verifying...' : 'Verify & Sync Apps Script'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Step-by-Step Deployment Instructions + Complete Script */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4C1D95]" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Complete Google Apps Script Backend (`ZoZoRecruitmentBackend.gs`)
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy('script', scriptCode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                {copiedKey === 'script' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'script' ? 'Copied' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download .gs</span>
              </button>
            </div>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs text-slate-600">
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">1. Open Apps Script</div>
              <p className="mt-1">Go to script.google.com and click New Project.</p>
            </li>
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">2. Paste Code.gs</div>
              <p className="mt-1">Replace Code.gs with this script and press Ctrl+S.</p>
            </li>
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">3. Run Setup</div>
              <p className="mt-1">Select setupZoZoRecruitmentDatabase, click Run, and approve permissions.</p>
            </li>
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">4. Deploy Web App</div>
              <p className="mt-1">Click Deploy → New deployment → Web app → Execute as: Me → Anyone.</p>
            </li>
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">5. Paste /exec URL</div>
              <p className="mt-1">Paste the Web App URL above and click Verify &amp; Sync.</p>
            </li>
          </ol>
        </div>

        <pre className="p-5 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed">
          {scriptCode}
        </pre>
      </div>
    </div>
  );
}
