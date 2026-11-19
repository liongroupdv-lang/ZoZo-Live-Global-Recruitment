import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Crown,
  ExternalLink,
  FileText,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import type { CountryOption } from '../data/countries';
import { COIN_PACKAGE_OPTIONS, RECRUITMENT_COPY, type Language } from '../data/translations';
import type { CoinPackageOption, RolePosition } from '../types/recruitment';
import { CountrySelector } from './CountrySelector';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ZoZoLogo } from './ZoZoLogo';

interface ApplicationFormProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  selectedRole: RolePosition | '';
  onSelectRole: (role: RolePosition) => void;
  logoUrl?: string | null;
}

interface SelectedCvFile {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
}

interface ApplicationReceipt {
  id: string;
  name: string;
  country: string;
  whatsapp: string;
  position: RolePosition;
  cvFileName: string;
  submittedAt: string;
}

type FieldErrorKey =
  | 'name'
  | 'country'
  | 'whatsapp'
  | 'position'
  | 'currentApp'
  | 'adminsCount'
  | 'agenciesCount'
  | 'coinPackage'
  | 'workExperience'
  | 'cvFile';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const WHATSAPP_REGEX = /^[+]?[0-9][0-9\s\-()]{5,22}$/;

function createSubmissionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',').pop() || '' : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function FormRoleIcon({ role, active }: { role: RolePosition; active: boolean }) {
  const cls = `w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#4F46E5]'}`;
  if (role === 'Super Admin') return <Crown className={cls} aria-hidden="true" />;
  if (role === 'Admin') return <ShieldCheck className={cls} aria-hidden="true" />;
  return <Coins className={cls} aria-hidden="true" />;
}

export function ApplicationForm({
  language,
  onChangeLanguage,
  selectedRole,
  onSelectRole,
  logoUrl,
}: ApplicationFormProps) {
  const copy = RECRUITMENT_COPY[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [currentApp, setCurrentApp] = useState('');
  const [adminsCount, setAdminsCount] = useState('');
  const [agenciesCount, setAgenciesCount] = useState('');
  const [coinPackage, setCoinPackage] = useState<CoinPackageOption | ''>('');
  const [workExperience, setWorkExperience] = useState('');
  const [cvFile, setCvFile] = useState<SelectedCvFile | null>(null);
  const [cvCustomError, setCvCustomError] = useState<'none' | 'type' | 'size'>('none');
  const [isDragging, setIsDragging] = useState(false);

  const [invalidFields, setInvalidFields] = useState<Partial<Record<FieldErrorKey, boolean>>>({});
  const [submitErrorType, setSubmitErrorType] = useState<'none' | 'network' | 'server' | 'duplicate'>('none');
  const [serverErrorText, setServerErrorText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionToken, setSubmissionToken] = useState<string>(() => createSubmissionToken());
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);

  const totalSteps = selectedRole === 'Super Admin' ? 9 : 8;

  const completedCount = useMemo(() => {
    let count = 0;
    if (name.trim()) count++;
    if (country) count++;
    if (whatsapp.trim()) count++;
    if (selectedRole) count++;
    if (currentApp.trim()) count++;
    if (selectedRole === 'Super Admin') {
      if (adminsCount.trim() !== '') count++;
      if (agenciesCount.trim() !== '') count++;
    } else if (selectedRole === 'Admin') {
      if (agenciesCount.trim() !== '') count++;
    } else if (selectedRole === 'Coin Seller') {
      if (coinPackage) count++;
    }
    if (workExperience.trim()) count++;
    if (cvFile) count++;
    return count;
  }, [
    name,
    country,
    whatsapp,
    selectedRole,
    currentApp,
    adminsCount,
    agenciesCount,
    coinPackage,
    workExperience,
    cvFile,
  ]);

  const progressPercent = Math.min(100, Math.round((completedCount / totalSteps) * 100));

  const clearFieldError = (field: FieldErrorKey) => {
    setInvalidFields((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSelectRole = (role: RolePosition) => {
    onSelectRole(role);
    setInvalidFields((prev) => {
      const next = { ...prev };
      delete next.position;
      delete next.adminsCount;
      delete next.agenciesCount;
      delete next.coinPackage;
      return next;
    });
  };

  const processSelectedFile = async (file: File | undefined) => {
    if (!file) return;
    setCvCustomError('none');
    clearFieldError('cvFile');

    const lower = file.name.toLowerCase();
    const validExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!validExt) {
      setCvFile(null);
      setCvCustomError('type');
      setInvalidFields((prev) => ({ ...prev, cvFile: true }));
      return;
    }
    if (file.size === 0 || file.size > MAX_CV_BYTES) {
      setCvFile(null);
      setCvCustomError('size');
      setInvalidFields((prev) => ({ ...prev, cvFile: true }));
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const fallbackMime = lower.endsWith('.pdf')
        ? 'application/pdf'
        : lower.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword';

      setCvFile({
        name: file.name,
        mimeType: file.type || fallbackMime,
        size: file.size,
        base64,
      });
    } catch {
      setCvCustomError('type');
      setInvalidFields((prev) => ({ ...prev, cvFile: true }));
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    void processSelectedFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    void processSelectedFile(file);
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<FieldErrorKey, boolean>> = {};
    if (!name.trim()) nextErrors.name = true;
    if (!country) nextErrors.country = true;
    if (!WHATSAPP_REGEX.test(whatsapp.trim())) nextErrors.whatsapp = true;
    if (!selectedRole) nextErrors.position = true;
    if (!currentApp.trim()) nextErrors.currentApp = true;

    if (selectedRole === 'Super Admin') {
      const parsedAdmins = Number(adminsCount);
      if (adminsCount.trim() === '' || !Number.isInteger(parsedAdmins) || parsedAdmins < 0) {
        nextErrors.adminsCount = true;
      }
      const parsedAgencies = Number(agenciesCount);
      if (agenciesCount.trim() === '' || !Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
        nextErrors.agenciesCount = true;
      }
    } else if (selectedRole === 'Admin') {
      const parsedAgencies = Number(agenciesCount);
      if (agenciesCount.trim() === '' || !Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
        nextErrors.agenciesCount = true;
      }
    } else if (selectedRole === 'Coin Seller') {
      if (!coinPackage) {
        nextErrors.coinPackage = true;
      }
    }

    if (!workExperience.trim()) nextErrors.workExperience = true;
    if (!cvFile) {
      nextErrors.cvFile = true;
      setCvCustomError('none');
    }

    setInvalidFields(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitErrorType('none');
    setServerErrorText('');

    if (!validate() || !country || !selectedRole || !cvFile) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        country: country.label,
        countryFlag: country.flag,
        countryName: country.name,
        whatsapp: whatsapp.trim(),
        position: selectedRole,
        currentApp: currentApp.trim(),
        workExperience: workExperience.trim(),
        cvFile,
        language,
        submissionToken,
      };

      if (selectedRole === 'Super Admin') {
        payload.adminsCount = Number(adminsCount);
        payload.agenciesCount = Number(agenciesCount);
      } else if (selectedRole === 'Admin') {
        payload.agenciesCount = Number(agenciesCount);
      } else if (selectedRole === 'Coin Seller') {
        payload.coinPackage = coinPackage;
      }

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.status === 409) {
        setSubmitErrorType('duplicate');
        return;
      }
      if (!response.ok) {
        setSubmitErrorType('server');
        setServerErrorText(data.error || copy.form.genericSubmitError);
        return;
      }

      setReceipt(data.receipt);
    } catch {
      setSubmitErrorType('network');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCountry(null);
    setWhatsapp('');
    setCurrentApp('');
    setAdminsCount('');
    setAgenciesCount('');
    setCoinPackage('');
    setWorkExperience('');
    setCvFile(null);
    setCvCustomError('none');
    setInvalidFields({});
    setSubmitErrorType('none');
    setServerErrorText('');
    setSubmissionToken(createSubmissionToken());
    setReceipt(null);
  };

  if (receipt) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0B0624] via-[#2E1065] to-[#0E7490] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ZoZoLogo logoUrl={logoUrl} size="sm" />
            <span className="text-xs font-semibold text-cyan-200">{copy.form.headerBanner}</span>
          </div>
          <div className="bg-white/95 rounded-lg p-0.5 shrink-0">
            <LanguageSwitcher language={language} onChange={onChangeLanguage} size="sm" />
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mb-5">
              <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {copy.confirmation.title}
            </h2>
            <p className="mt-3 text-slate-700 leading-relaxed flex items-start gap-2.5">
              <MessageCircle className="w-5 h-5 text-[#0891B2] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{copy.confirmation.message}</span>
            </p>

            <dl className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">{copy.confirmation.applicantLabel}</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{receipt.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{copy.confirmation.positionLabel}</dt>
                <dd className="font-semibold text-[#4F46E5] mt-0.5">{receipt.position}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{copy.confirmation.countryLabel}</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{receipt.country}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{copy.confirmation.whatsappLabel}</dt>
                <dd className="font-mono text-slate-900 mt-0.5 tabular-nums">
                  {receipt.whatsapp}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">{copy.confirmation.cvFileLabel}</dt>
                <dd className="font-medium text-slate-900 mt-0.5 inline-flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F46E5]" aria-hidden="true" />
                  <span>{receipt.cvFileName}</span>
                </dd>
              </div>
            </dl>

            <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {copy.confirmation.downloadCardTitle}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {copy.confirmation.downloadCardSubtitle}
                </p>
              </div>
              <a
                href="https://download.zozolive.site/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] hover:opacity-95 rounded-xl transition-opacity whitespace-nowrap shrink-0"
              >
                <span>{copy.confirmation.downloadCardButton}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{copy.confirmation.submitAnotherButton}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Top Language Bar + Branded Gradient Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0B0624] via-[#31106B] to-[#0E7490] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ZoZoLogo logoUrl={logoUrl} size="sm" />
          <span className="text-xs font-semibold tracking-wide text-cyan-200">
            {copy.form.headerBanner}
          </span>
        </div>
        <div className="bg-white/95 rounded-lg p-0.5 shrink-0 self-start sm:self-auto">
          <LanguageSwitcher language={language} onChange={onChangeLanguage} size="sm" />
        </div>
      </div>

      {/* Form Title & Dynamic Progress */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">{copy.form.formTitle}</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{copy.form.formDescription}</p>
        </div>
        <div className="flex items-center gap-3 min-w-[180px] shrink-0">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0">
            {completedCount}/{totalSteps} {copy.form.progressLabel}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {submitErrorType !== 'none' && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {submitErrorType === 'network'
              ? copy.form.networkError
              : submitErrorType === 'duplicate'
              ? copy.form.duplicateError
              : serverErrorText}
          </div>
        )}

        {/* Section 1: Applicant Personal Information */}
        <section className="space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              {copy.form.sections.personal.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{copy.form.sections.personal.subtitle}</p>
          </div>

          <div>
            <label htmlFor="applicant-name" className="block text-sm font-semibold text-slate-900">
              {copy.form.questions.name.label} <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">{copy.form.questions.name.help}</p>
            <input
              id="applicant-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder={copy.form.questions.name.placeholder}
              className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                invalidFields.name
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-300 focus:border-[#4F46E5]'
              }`}
            />
            {invalidFields.name && (
              <p className="mt-1.5 text-xs text-red-600">
                {copy.form.questions.name.errorRequired}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900">
                {copy.form.questions.country.label} <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                {copy.form.questions.country.help}
              </p>
              <CountrySelector
                value={country}
                onChange={(nextCountry) => {
                  setCountry(nextCountry);
                  clearFieldError('country');
                }}
                hasError={Boolean(invalidFields.country)}
                placeholder={copy.form.questions.country.placeholder}
                searchPlaceholder={copy.form.questions.country.searchPlaceholder}
                emptySearch={copy.form.questions.country.emptySearch}
              />
              {invalidFields.country && (
                <p className="mt-1.5 text-xs text-red-600">
                  {copy.form.questions.country.errorRequired}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="whatsapp-number" className="block text-sm font-semibold text-slate-900">
                {copy.form.questions.whatsapp.label} <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                {copy.form.questions.whatsapp.help}
              </p>
              <input
                id="whatsapp-number"
                type="tel"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  clearFieldError('whatsapp');
                }}
                placeholder={copy.form.questions.whatsapp.placeholder}
                className={`w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                  invalidFields.whatsapp
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-[#4F46E5]'
                }`}
              />
              {invalidFields.whatsapp && (
                <p className="mt-1.5 text-xs text-red-600">
                  {copy.form.questions.whatsapp.errorInvalid}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Application Position & Conditional Role Questions */}
        <section className="space-y-5 pt-2">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              {copy.form.sections.professional.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {copy.form.sections.professional.subtitle}
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-slate-900">
              {copy.form.questions.position.label} <span className="text-red-600">*</span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              {copy.form.questions.position.help}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {copy.openRoles.items.map((item) => {
                const active = selectedRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSelectRole(item.role)}
                    aria-pressed={active}
                    className={`p-4 text-left rounded-xl border transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] ${
                      active
                        ? 'border-[#4F46E5] bg-indigo-50/70 ring-2 ring-[#4F46E5]/15'
                        : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            active
                              ? 'bg-gradient-to-br from-[#2563EB] via-[#7C3AED] to-[#06B6D4]'
                              : 'bg-indigo-50'
                          }`}
                        >
                          <FormRoleIcon role={item.role} active={active} />
                        </span>
                        <span
                          className={`font-display text-sm font-bold ${
                            active ? 'text-[#4F46E5]' : 'text-slate-900'
                          }`}
                        >
                          {item.role}
                        </span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          active ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-slate-300'
                        }`}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {item.formSummary}
                    </p>
                  </button>
                );
              })}
            </div>
            {invalidFields.position && (
              <p className="mt-1.5 text-xs text-red-600">
                {copy.form.questions.position.errorRequired}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="current-app" className="block text-sm font-semibold text-slate-900">
              {copy.form.questions.currentApp.label} <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">
              {copy.form.questions.currentApp.help}
            </p>
            <input
              id="current-app"
              type="text"
              value={currentApp}
              onChange={(e) => {
                setCurrentApp(e.target.value);
                clearFieldError('currentApp');
              }}
              placeholder={copy.form.questions.currentApp.placeholder}
              className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                invalidFields.currentApp
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-300 focus:border-[#4F46E5]'
              }`}
            />
            {invalidFields.currentApp && (
              <p className="mt-1.5 text-xs text-red-600">
                {copy.form.questions.currentApp.errorRequired}
              </p>
            )}
          </div>

          {/* Conditional Fields for Super Admin */}
          {selectedRole === 'Super Admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="admins-count" className="block text-sm font-semibold text-slate-900">
                  {copy.form.questions.adminsCount.label} <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">
                  {copy.form.questions.adminsCount.help}
                </p>
                <input
                  id="admins-count"
                  type="number"
                  min={0}
                  step={1}
                  value={adminsCount}
                  onChange={(e) => {
                    setAdminsCount(e.target.value);
                    clearFieldError('adminsCount');
                  }}
                  placeholder={copy.form.questions.adminsCount.placeholder}
                  className={`w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                    invalidFields.adminsCount
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-300 focus:border-[#4F46E5]'
                  }`}
                />
                {invalidFields.adminsCount && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {copy.form.questions.adminsCount.errorInvalid}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="agencies-count-sa"
                  className="block text-sm font-semibold text-slate-900"
                >
                  {copy.form.questions.agenciesCountSuperAdmin.label}{' '}
                  <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">
                  {copy.form.questions.agenciesCountSuperAdmin.help}
                </p>
                <input
                  id="agencies-count-sa"
                  type="number"
                  min={0}
                  step={1}
                  value={agenciesCount}
                  onChange={(e) => {
                    setAgenciesCount(e.target.value);
                    clearFieldError('agenciesCount');
                  }}
                  placeholder={copy.form.questions.agenciesCountSuperAdmin.placeholder}
                  className={`w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                    invalidFields.agenciesCount
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-300 focus:border-[#4F46E5]'
                  }`}
                />
                {invalidFields.agenciesCount && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {copy.form.questions.agenciesCountSuperAdmin.errorInvalid}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Conditional Field for Admin */}
          {selectedRole === 'Admin' && (
            <div>
              <label
                htmlFor="agencies-count-admin"
                className="block text-sm font-semibold text-slate-900"
              >
                {copy.form.questions.agenciesCountAdmin.label}{' '}
                <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                {copy.form.questions.agenciesCountAdmin.help}
              </p>
              <input
                id="agencies-count-admin"
                type="number"
                min={0}
                step={1}
                value={agenciesCount}
                onChange={(e) => {
                  setAgenciesCount(e.target.value);
                  clearFieldError('agenciesCount');
                }}
                placeholder={copy.form.questions.agenciesCountAdmin.placeholder}
                className={`w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                  invalidFields.agenciesCount
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-300 focus:border-[#4F46E5]'
                }`}
              />
              {invalidFields.agenciesCount && (
                <p className="mt-1.5 text-xs text-red-600">
                  {copy.form.questions.agenciesCountAdmin.errorInvalid}
                </p>
              )}
            </div>
          )}

          {/* Conditional Package Selector for Coin Seller */}
          {selectedRole === 'Coin Seller' && (
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                {copy.form.questions.coinPackage.label} <span className="text-red-600">*</span>
              </span>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                {copy.form.questions.coinPackage.help}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {COIN_PACKAGE_OPTIONS.map((pkg) => {
                  const active = coinPackage === pkg;
                  return (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => {
                        setCoinPackage(pkg);
                        clearFieldError('coinPackage');
                      }}
                      aria-pressed={active}
                      className={`py-3 px-4 rounded-xl border font-mono text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer ${
                        active
                          ? 'border-[#0891B2] bg-cyan-50 text-[#0E7490] ring-2 ring-[#0891B2]/20'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-cyan-300'
                      }`}
                    >
                      {pkg}
                    </button>
                  );
                })}
              </div>
              {invalidFields.coinPackage && (
                <p className="mt-1.5 text-xs text-red-600">
                  {copy.form.questions.coinPackage.errorRequired}
                </p>
              )}
            </div>
          )}

          {/* Work Experience or Coin Selling Experience */}
          <div>
            <label
              htmlFor="work-experience"
              className="block text-sm font-semibold text-slate-900"
            >
              {selectedRole === 'Coin Seller'
                ? copy.form.questions.workExperienceCoinSeller.label
                : copy.form.questions.workExperienceGeneral.label}{' '}
              <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">
              {selectedRole === 'Coin Seller'
                ? copy.form.questions.workExperienceCoinSeller.help
                : copy.form.questions.workExperienceGeneral.help}
            </p>
            <textarea
              id="work-experience"
              rows={4}
              value={workExperience}
              onChange={(e) => {
                setWorkExperience(e.target.value);
                clearFieldError('workExperience');
              }}
              placeholder={
                selectedRole === 'Coin Seller'
                  ? copy.form.questions.workExperienceCoinSeller.placeholder
                  : copy.form.questions.workExperienceGeneral.placeholder
              }
              className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/15 ${
                invalidFields.workExperience
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-300 focus:border-[#4F46E5]'
              }`}
            />
            {invalidFields.workExperience && (
              <p className="mt-1.5 text-xs text-red-600">
                {selectedRole === 'Coin Seller'
                  ? copy.form.questions.workExperienceCoinSeller.errorRequired
                  : copy.form.questions.workExperienceGeneral.errorRequired}
              </p>
            )}
          </div>
        </section>

        {/* Section 3: Secure CV Upload (PDF, DOC, DOCX) */}
        <section className="space-y-4 pt-2">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              {copy.form.sections.cv.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{copy.form.sections.cv.subtitle}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">
              {copy.form.questions.cvFile.label} <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">{copy.form.questions.cvFile.help}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!cvFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors cursor-pointer ${
                  invalidFields.cvFile
                    ? 'border-red-400 bg-red-50/40'
                    : isDragging
                    ? 'border-[#0891B2] bg-cyan-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-[#4F46E5] hover:bg-indigo-50/30'
                }`}
              >
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-indigo-100 text-[#4F46E5] mb-3">
                  <Upload className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {copy.form.questions.cvFile.dropTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">{copy.form.questions.cvFile.dropHint}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#4F46E5] bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  {copy.form.questions.cvFile.chooseButton}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {cvFile.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      {formatFileSize(cvFile.size)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    {copy.form.questions.cvFile.replaceButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{copy.form.questions.cvFile.removeButton}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span>{copy.form.questions.cvFile.securityNote}</span>
            </div>

            {invalidFields.cvFile && (
              <p className="mt-1.5 text-xs text-red-600">
                {cvCustomError === 'type'
                  ? copy.form.questions.cvFile.errorType
                  : cvCustomError === 'size'
                  ? copy.form.questions.cvFile.errorSize
                  : copy.form.questions.cvFile.errorRequired}
              </p>
            )}
          </div>
        </section>

        {/* Section 4: App Download */}
        <section className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              {copy.form.sections.download.title}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {copy.form.sections.download.subtitle}
            </p>
          </div>
          <a
            href="https://download.zozolive.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <span>{copy.form.sections.download.button}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </section>

        {/* Submit Application */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{copy.form.downloadReminderLabel} </span>
            <a
              href="https://download.zozolive.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4F46E5] underline hover:text-[#0891B2]"
            >
              https://download.zozolive.site/
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] hover:opacity-95 disabled:opacity-60 rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
          >
            <span>{submitting ? copy.form.submittingButton : copy.form.submitButton}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
