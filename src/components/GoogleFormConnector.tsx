import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  FolderSearch,
  Info,
  Link2,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminPermissionLevel, BackendConfig } from '../types/recruitment';
import { ConfirmModal } from './ConfirmModal';

const SHARED_PUBLIC_PORTAL_URL =
  'https://ais-pre-menrapitnclw3tdj2oqpih-957770790639.asia-east1.run.app/';

interface DriveFormFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

interface InspectedForm {
  formId: string;
  title: string;
  description: string;
  responderUri: string;
}

interface GoogleFormConnectorProps {
  config: BackendConfig;
  actorRole: AdminPermissionLevel;
  accessToken: string;
  publicOrigin: string;
  onSaveConfig: (next: Partial<BackendConfig>) => Promise<void>;
  onReconnectGoogle: () => Promise<void>;
}

function extractEditableFormId(input: string): { formId: string; isResponderOnly: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { formId: '', isResponderOnly: false };

  if (/\/forms\/d\/e\//i.test(trimmed)) {
    return { formId: '', isResponderOnly: true };
  }

  const match = trimmed.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return { formId: match[1], isResponderOnly: false };
  }

  // Raw Drive/Form ID check
  if (/^[a-zA-Z0-9_-]{12,}$/.test(trimmed)) {
    return { formId: trimmed, isResponderOnly: false };
  }

  return { formId: '', isResponderOnly: false };
}

function buildBilingualPortalNotice(portalUrl: string): string {
  const cleanUrl = portalUrl.trim() || SHARED_PUBLIC_PORTAL_URL;
  return [
    'ZOZO LIVE – OFFICIAL GLOBAL RECRUITMENT PORTAL (Super Admin · Admin · Coin Seller)',
    '',
    'Apply directly on our official bilingual recruitment portal (No Google Sign-In Required):',
    cleanUrl,
    '',
    'বাংলা আবেদনকারীরা সরাসরি আমাদের অফিসিয়াল ওয়েবসাইটে গিয়ে ফর্মটি পূরণ করুন (English / বাংলা উভয় ভাষায়):',
    cleanUrl,
    '',
    'Official ZoZo Live App Download: https://download.zozolive.site/',
  ].join('\n');
}

export function GoogleFormConnector({
  config,
  actorRole,
  accessToken,
  publicOrigin,
  onSaveConfig,
  onReconnectGoogle,
}: GoogleFormConnectorProps) {
  const isOwner = actorRole === 'Owner';

  const defaultPortalUrl = useMemo(() => {
    if (
      publicOrigin &&
      !publicOrigin.includes('localhost') &&
      !publicOrigin.includes('127.0.0.1')
    ) {
      return `${publicOrigin.replace(/\/$/, '')}/`;
    }
    return SHARED_PUBLIC_PORTAL_URL;
  }, [publicOrigin]);

  const [portalUrl, setPortalUrl] = useState(defaultPortalUrl);
  const [formInput, setFormInput] = useState(config.googleFormId || config.googleFormUrl || '');
  const [driveForms, setDriveForms] = useState<DriveFormFile[]>([]);
  const [loadingDriveForms, setLoadingDriveForms] = useState(false);

  const [inspectedForm, setInspectedForm] = useState<InspectedForm | null>(null);
  const [inspectingForm, setInspectingForm] = useState(false);

  const [descriptionText, setDescriptionText] = useState(() =>
    buildBilingualPortalNotice(defaultPortalUrl)
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [notice, setNotice] = useState('');
  const [busyMutation, setBusyMutation] = useState(false);

  const [pendingAction, setPendingAction] = useState<
    | { type: 'update'; formId: string; title: string }
    | { type: 'create'; title: string }
    | null
  >(null);

  useEffect(() => {
    if (config.googleFormId && !formInput) {
      setFormInput(config.googleFormId);
    }
  }, [config.googleFormId, formInput]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleLoadDriveForms = async () => {
    setError('');
    setNotice('');
    setNeedsReconnect(false);
    setLoadingDriveForms(true);
    try {
      const q = encodeURIComponent(
        "mimeType='application/vnd.google-apps.form' and trashed=false"
      );
      const fields = encodeURIComponent('files(id,name,webViewLink,modifiedTime)');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.status === 401 || res.status === 403) {
        setNeedsReconnect(true);
        throw new Error(
          'Your Google Drive / Forms authorization session expired or lacks permission. Click Reconnect Google Account below.'
        );
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Unable to list Google Forms from Google Drive.');
      }

      const files: DriveFormFile[] = Array.isArray(data.files) ? data.files : [];
      setDriveForms(files);
      if (files.length === 0) {
        setNotice(
          'No existing Google Forms found in this Google Drive account yet. You can create a linked portal redirect form below or paste an edit URL.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Google Forms from Drive.');
    } finally {
      setLoadingDriveForms(false);
    }
  };

  const inspectFormById = async (rawInput: string) => {
    setError('');
    setNotice('');
    setNeedsReconnect(false);

    const parsed = extractEditableFormId(rawInput);
    if (parsed.isResponderOnly) {
      setError(
        'That is a public /forms/d/e/... link. Open the form in Google Forms editor and paste the /forms/d/<FORM_ID>/edit URL, or click "Load My Google Forms" above.'
      );
      return;
    }
    if (!parsed.formId) {
      setError('Paste a valid Google Form edit URL (https://docs.google.com/forms/d/.../edit) or Form ID.');
      return;
    }

    setInspectingForm(true);
    try {
      const safeId = encodeURIComponent(parsed.formId.trim());
      const res = await fetch(`https://forms.googleapis.com/v1/forms/${safeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 401 || res.status === 403) {
        setNeedsReconnect(true);
        throw new Error(
          'Google Forms API rejected the token. Click Reconnect Google Account and approve Google Forms permissions.'
        );
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Unable to load the selected Google Form.');
      }

      setInspectedForm({
        formId: data.formId || parsed.formId,
        title: data.info?.title || 'Untitled Google Form',
        description: data.info?.description || '',
        responderUri:
          data.responderUri || `https://docs.google.com/forms/d/${safeId}/viewform`,
      });
      setFormInput(data.formId || parsed.formId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to inspect Google Form.');
    } finally {
      setInspectingForm(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    setError('');
    setNotice('');
    setNeedsReconnect(false);
    setBusyMutation(true);

    try {
      if (pendingAction.type === 'update') {
        const safeId = encodeURIComponent(pendingAction.formId.trim());
        const patchRes = await fetch(
          `https://forms.googleapis.com/v1/forms/${safeId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              includeFormInResponse: true,
              requests: [
                {
                  updateFormInfo: {
                    info: {
                      description: descriptionText,
                    },
                    updateMask: 'description',
                  },
                },
              ],
            }),
          }
        );

        if (patchRes.status === 401 || patchRes.status === 403) {
          setNeedsReconnect(true);
          throw new Error('Google Forms permission expired. Reconnect Google Account and try again.');
        }

        const patchData = await patchRes.json();
        if (!patchRes.ok) {
          throw new Error(patchData?.error?.message || 'Failed to update Google Form description.');
        }

        const updatedForm = patchData.form || {};
        const responderUri =
          updatedForm.responderUri ||
          inspectedForm?.responderUri ||
          `https://docs.google.com/forms/d/${safeId}/viewform`;

        setInspectedForm({
          formId: updatedForm.formId || pendingAction.formId,
          title: updatedForm.info?.title || pendingAction.title,
          description: updatedForm.info?.description || descriptionText,
          responderUri,
        });

        await onSaveConfig({
          googleFormId: pendingAction.formId,
          googleFormUrl: responderUri,
        });

        setNotice(
          `Updated "${pendingAction.title}"! Anyone who opens your Google Form will now see the clickable ZoZo Live Portal link in both English & বাংলা.`
        );
      } else if (pendingAction.type === 'create') {
        const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            info: {
              title: pendingAction.title,
              documentTitle: pendingAction.title,
            },
          }),
        });

        if (createRes.status === 401 || createRes.status === 403) {
          setNeedsReconnect(true);
          throw new Error('Google Forms permission expired. Reconnect Google Account and try again.');
        }

        const created = await createRes.json();
        if (!createRes.ok || !created.formId) {
          throw new Error(created?.error?.message || 'Failed to create Google Form.');
        }

        const safeNewId = encodeURIComponent(String(created.formId).trim());
        const batchRes = await fetch(
          `https://forms.googleapis.com/v1/forms/${safeNewId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              includeFormInResponse: true,
              requests: [
                {
                  updateFormInfo: {
                    info: {
                      description: descriptionText,
                    },
                    updateMask: 'description',
                  },
                },
              ],
            }),
          }
        );

        const batchData = await batchRes.json();
        if (!batchRes.ok) {
          throw new Error(
            batchData?.error?.message || 'Created the form, but failed to add the portal description.'
          );
        }

        const finalForm = batchData.form || created;
        const responderUri =
          finalForm.responderUri || `https://docs.google.com/forms/d/${safeNewId}/viewform`;

        setInspectedForm({
          formId: finalForm.formId,
          title: finalForm.info?.title || pendingAction.title,
          description: finalForm.info?.description || descriptionText,
          responderUri,
        });
        setFormInput(finalForm.formId);

        await onSaveConfig({
          googleFormId: finalForm.formId,
          googleFormUrl: responderUri,
        });

        setNotice(
          `Created and linked "${pendingAction.title}"! Share either the Public Portal URL directly or this Google Form responder link.`
        );
      }

      setPendingAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Forms operation failed.');
      setPendingAction(null);
    } finally {
      setBusyMutation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Google Form Connector &amp; Public Link Setup
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect your existing Google Form under{' '}
          <span className="font-mono text-slate-900">{config.ownerEmail}</span> so applicants
          who open your Google Form are routed directly to the live ZoZo Live portal.
        </p>
      </div>

      {/* Clear Platform Explanation */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-indigo-950 space-y-1.5 leading-relaxed">
          <p className="font-semibold">
            How public applicants see this exact custom ZoZo Live Recruitment Portal:
          </p>
          <p>
            Google Forms (<span className="font-mono">docs.google.com/forms</span>) does not allow
            embedding custom websites inside its own page. Share the{' '}
            <strong>Public Portal URL</strong> below directly with applicants so they immediately see
            this bilingual portal without Google sign-in — and use Step 2 below to place the clickable
            portal link inside your existing Google Form header.
          </p>
        </div>
      </div>

      {/* Step 1: Direct Public Portal Link */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              1. Direct Public Portal URL (Shows This Custom App Immediately)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Share this URL anywhere (WhatsApp, Facebook, Telegram, Bio) — no Google login needed.
            </p>
          </div>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] rounded-lg whitespace-nowrap shrink-0"
          >
            <span>Open Public Portal</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="url"
            value={portalUrl}
            onChange={(e) => {
              setPortalUrl(e.target.value);
              setDescriptionText(buildBilingualPortalNotice(e.target.value));
            }}
            aria-label="Public Portal URL"
            className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4C1D95]"
          />
          <button
            type="button"
            onClick={() => handleCopy('portal-url', portalUrl)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer shrink-0"
          >
            {copiedKey === 'portal-url' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <span>{error}</span>
          {needsReconnect && (
            <button
              type="button"
              onClick={onReconnectGoogle}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg whitespace-nowrap cursor-pointer shrink-0"
            >
              Reconnect Google Account
            </button>
          )}
        </div>
      )}

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {notice}
        </div>
      )}

      {/* Step 2: Connect Existing Google Form from Drive */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Link Your Existing Google Form to This Portal
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select an existing Google Form from Google Drive (preserves existing questions &amp;
              responses) and add the bilingual portal link banner at the top.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadDriveForms}
            disabled={loadingDriveForms}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4C1D95] bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderSearch className="w-4 h-4" aria-hidden="true" />
            <span>{loadingDriveForms ? 'Loading Drive Forms...' : 'Load My Google Forms'}</span>
          </button>
        </div>

        {/* Saved Google Form Status */}
        {config.googleFormUrl && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Currently Linked Google Form
              </div>
              <a
                href={config.googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#4F46E5] hover:underline break-all"
              >
                {config.googleFormUrl}
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy('linked-form-url', config.googleFormUrl || '')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {copiedKey === 'linked-form-url' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'linked-form-url' ? 'Copied' : 'Copy Form URL'}</span>
              </button>
              <a
                href={config.googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg"
              >
                <span>Open Form</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {/* Drive Forms List */}
        {driveForms.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {driveForms.map((file) => (
              <div
                key={file.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#4C1D95] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{file.name}</div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">{file.id}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => inspectFormById(file.id)}
                  disabled={inspectingForm}
                  className="px-3 py-1.5 text-xs font-semibold text-[#4C1D95] bg-violet-50 hover:bg-violet-100 rounded-md cursor-pointer shrink-0"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual Form URL / ID Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={formInput}
            onChange={(e) => setFormInput(e.target.value)}
            placeholder="Paste Google Form edit URL (https://docs.google.com/forms/d/.../edit) or Form ID"
            aria-label="Google Form Edit URL or ID"
            className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4C1D95]"
          />
          <button
            type="button"
            onClick={() => inspectFormById(formInput)}
            disabled={inspectingForm || !formInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${inspectingForm ? 'animate-spin' : ''}`} />
            <span>{inspectingForm ? 'Inspecting...' : 'Inspect Form'}</span>
          </button>
        </div>

        {/* Selected Form Preview & Description Editor */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {inspectedForm && (
            <div className="p-3.5 rounded-lg bg-violet-50/70 border border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">{inspectedForm.title}</div>
                <div className="text-[11px] font-mono text-slate-600 truncate">
                  ID: {inspectedForm.formId}
                </div>
              </div>
              <a
                href={inspectedForm.responderUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C1D95] hover:underline shrink-0"
              >
                <span>View Responder Form</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Google Form Header Banner Text (Bilingual English + বাংলা with Clickable Portal Link)
              </label>
              <button
                type="button"
                onClick={() => handleCopy('banner-text', descriptionText)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4C1D95] hover:underline cursor-pointer"
              >
                {copiedKey === 'banner-text' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied Text</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Banner Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={7}
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4C1D95] leading-relaxed"
            />
          </div>

          {isOwner ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={!inspectedForm || busyMutation}
                onClick={() => {
                  if (!inspectedForm) return;
                  setPendingAction({
                    type: 'update',
                    formId: inspectedForm.formId,
                    title: inspectedForm.title,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Update Selected Google Form Description</span>
              </button>

              <button
                type="button"
                disabled={busyMutation}
                onClick={() =>
                  setPendingAction({
                    type: 'create',
                    title: 'ZoZo Live – Official Global Recruitment Portal',
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Create New Linked Google Form</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Only the primary Owner ({config.ownerEmail}) can modify or create Google Forms.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={
          pendingAction?.type === 'create'
            ? 'Create New Linked Google Form?'
            : 'Update Existing Google Form Description?'
        }
        description={
          pendingAction?.type === 'create'
            ? `This will create a new Google Form titled "${pendingAction.title}" under ${config.ownerEmail} and insert the bilingual ZoZo Live Public Portal link into its header description.`
            : pendingAction
              ? `This will update only the header description of "${pendingAction.title}" (ID: ${pendingAction.formId}) so visitors see the clickable ZoZo Live Portal link. Existing questions and responses will remain untouched.`
              : ''
        }
        confirmLabel={
          pendingAction?.type === 'create' ? 'Create & Link Google Form' : 'Update Google Form'
        }
        busy={busyMutation}
        onConfirm={executeConfirmedAction}
        onCancel={() => !busyMutation && setPendingAction(null)}
      />
    </div>
  );
}
