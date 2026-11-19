import { ExternalLink, Mail, Send, X } from 'lucide-react';
import { useState } from 'react';
import type { EmailNotificationRecord } from '../types/recruitment';

interface EmailNotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  ownerEmail: string;
  notifications: EmailNotificationRecord[];
  onSendTest: (language: 'en' | 'bn') => Promise<void>;
}

export function EmailNotificationsPanel({
  open,
  onClose,
  ownerEmail,
  notifications,
  onSendTest,
}: EmailNotificationsPanelProps) {
  const [testingLang, setTestingLang] = useState<'en' | 'bn' | null>(null);
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const handleTest = async (lang: 'en' | 'bn') => {
    setTestingLang(lang);
    setNotice('');
    try {
      await onSendTest(lang);
      setNotice(
        `Dispatched ${lang === 'bn' ? 'Bengali' : 'English'} test notification ("New Application Received – ZoZo Live Recruitment") for ${ownerEmail}.`
      );
    } finally {
      setTestingLang(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-notifications-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-[#4F46E5]" aria-hidden="true" />
            <div>
              <h2
                id="email-notifications-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Instant Email Notifications
              </h2>
              <p className="text-xs text-slate-500">
                Recipient: <span className="font-mono text-slate-700">{ownerEmail}</span> · Subject: New Application Received – ZoZo Live Recruitment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Email Notifications"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600 leading-relaxed">
              Automatically triggered after every submission with Applicant Name, Country, WhatsApp
              Number, Applied Position, role-specific metrics, CV link, and Admin View link.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={testingLang !== null}
                onClick={() => handleTest('en')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{testingLang === 'en' ? 'Testing...' : 'Test English'}</span>
              </button>
              <button
                type="button"
                disabled={testingLang !== null}
                onClick={() => handleTest('bn')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{testingLang === 'bn' ? 'Testing...' : 'Test বাংলা'}</span>
              </button>
            </div>
          </div>

          {notice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {notice}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No email notifications dispatched yet. Submit an application or click Test English /
              Test বাংলা above to verify.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="font-semibold text-slate-900">{item.subject}</div>
                    <div className="text-slate-500 tabular-nums">
                      {new Date(item.sentAt).toLocaleString()} ·{' '}
                      {item.language === 'bn' ? 'বাংলা' : 'English'} · {item.deliveryStatus}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
                    <div>
                      <span className="font-medium text-slate-800">Applicant:</span>{' '}
                      {item.applicantName}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">Position:</span> {item.position}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">Country:</span> {item.country}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">WhatsApp:</span>{' '}
                      <span className="font-mono tabular-nums">{item.whatsapp}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">Current App:</span>{' '}
                      {item.currentApp}
                    </div>
                    {item.adminsCount !== undefined && (
                      <div>
                        <span className="font-medium text-slate-800">Admins:</span>{' '}
                        <span className="font-mono tabular-nums">{item.adminsCount}</span>
                      </div>
                    )}
                    {item.agenciesCount !== undefined && (
                      <div>
                        <span className="font-medium text-slate-800">Agencies:</span>{' '}
                        <span className="font-mono tabular-nums">{item.agenciesCount}</span>
                      </div>
                    )}
                    {item.coinPackage && (
                      <div>
                        <span className="font-medium text-slate-800">Coin Package:</span>{' '}
                        <span className="font-mono tabular-nums">{item.coinPackage}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium text-slate-800">Experience:</span>{' '}
                    {item.workExperience}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <a
                      href={item.cvLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4F46E5] underline inline-flex items-center gap-1"
                    >
                      <span>CV Link</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                    <a
                      href={item.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4F46E5] underline inline-flex items-center gap-1"
                    >
                      <span>View Application</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
