import { ImagePlus, RotateCcw } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import type { AdminPermissionLevel, BrandAssets } from '../types/recruitment';

interface BrandAssetsPanelProps {
  assets: BrandAssets;
  actorRole: AdminPermissionLevel;
  onUploadAsset: (kind: 'logo' | 'mascot', name: string, base64: string) => Promise<void>;
  onResetAsset: (kind: 'logo' | 'mascot') => Promise<void>;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function BrandAssetsPanel({
  assets,
  actorRole,
  onUploadAsset,
  onResetAsset,
}: BrandAssetsPanelProps) {
  const [busyKind, setBusyKind] = useState<'logo' | 'mascot' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isOwner = actorRole === 'Owner';

  const handleFile = async (kind: 'logo' | 'mascot', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2 MB or smaller.');
      return;
    }

    setError('');
    setNotice('');
    setBusyKind(kind);
    try {
      const dataUrl = await readAsDataUrl(file);
      await onUploadAsset(kind, file.name, dataUrl);
      setNotice(
        `Updated official ZoZo Live ${kind === 'logo' ? 'Logo' : 'Mascot'} across the Public Application Portal and Admin Dashboard.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload asset.');
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Official ZoZo Live Logo &amp; Mascot
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your official PNG, SVG, JPG, or WEBP brand files (max 2 MB) to display across the
          public recruitment header and hero portal.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['logo', 'mascot'] as const).map((kind) => {
          const url = kind === 'logo' ? assets.logoUrl : assets.mascotUrl;
          const title = kind === 'logo' ? 'Official ZoZo Live Logo' : 'Official ZoZo Live Mascot';
          const desc =
            kind === 'logo'
              ? 'Displayed in the Top Navigation Bar, Hero Lockup, and Confirmation Screen.'
              : 'Displayed prominently alongside the animated Global World Map in the Public Hero.';

          return (
            <div
              key={kind}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>

              <div className="h-44 rounded-xl border border-slate-200 bg-gradient-to-br from-[#16072E] via-[#2E1065] to-[#1E3A8A] flex items-center justify-center p-4 overflow-hidden">
                {url ? (
                  <img
                    src={url}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="max-h-36 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-300">
                    No custom {kind} uploaded yet
                  </div>
                )}
              </div>

              {isOwner ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] rounded-lg cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{busyKind === kind ? 'Uploading...' : `Upload ${kind === 'logo' ? 'Logo' : 'Mascot'}`}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      disabled={busyKind !== null}
                      onChange={(e) => handleFile(kind, e)}
                      className="hidden"
                    />
                  </label>
                  {url && (
                    <button
                      type="button"
                      disabled={busyKind !== null}
                      onClick={() => onResetAsset(kind)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Only the primary Owner can update official brand assets.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
