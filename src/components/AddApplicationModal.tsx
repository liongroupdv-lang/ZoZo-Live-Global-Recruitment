import { FileText, Upload, UserPlus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ALL_COUNTRIES, type CountryOption } from '../data/countries';
import { COIN_PACKAGE_OPTIONS } from '../data/translations';
import type {
  AdminCreateApplicationPayload,
  ApplicationStatus,
  CoinPackageOption,
  CvFilePayload,
  RolePosition,
} from '../types/recruitment';
import { CountrySelector } from './CountrySelector';

interface AddApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: AdminCreateApplicationPayload) => Promise<void>;
}

const MAX_CV_BYTES = 5 * 1024 * 1024;
const VALID_EXT_REGEX = /\.(pdf|docx?)$/i;
const WHATSAPP_REGEX = /^[+]?[0-9][0-9\s\-()]{5,22}$/;
const STATUS_OPTIONS: ApplicationStatus[] = ['Pending', 'Under Review', 'Approved', 'Rejected'];

export function AddApplicationModal({
  open,
  onClose,
  onCreate,
}: AddApplicationModalProps) {
  const [name, setName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [position, setPosition] = useState<RolePosition>('Super Admin');
  const [currentApp, setCurrentApp] = useState('');
  const [adminsCount, setAdminsCount] = useState('0');
  const [agenciesCount, setAgenciesCount] = useState('0');
  const [coinPackage, setCoinPackage] = useState<CoinPackageOption>('$500');
  const [workExperience, setWorkExperience] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Pending');
  const [cvFile, setCvFile] = useState<CvFilePayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const resetForm = () => {
    setName('');
    setSelectedCountry(null);
    setWhatsapp('');
    setPosition('Super Admin');
    setCurrentApp('');
    setAdminsCount('0');
    setAgenciesCount('0');
    setCoinPackage('$500');
    setWorkExperience('');
    setStatus('Pending');
    setCvFile(null);
    setError('');
  };

  const handleCvPick = (file: File | null) => {
    setError('');
    if (!file) {
      setCvFile(null);
      return;
    }
    if (!VALID_EXT_REGEX.test(file.name)) {
      setError('Invalid CV file type. Only PDF, DOC, and DOCX files are allowed.');
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setError('CV file exceeds the maximum allowed size of 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] || '' : result;
      setCvFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const countryObj = selectedCountry;
    const trimmedWhatsapp = whatsapp.trim();
    const trimmedApp = currentApp.trim();
    const trimmedExp = workExperience.trim();

    if (!trimmedName) {
      setError('Full Name is required.');
      return;
    }
    if (!countryObj) {
      setError('Country selection is required.');
      return;
    }
    if (!WHATSAPP_REGEX.test(trimmedWhatsapp)) {
      setError('Enter a valid WhatsApp number (at least 6 digits).');
      return;
    }
    if (!trimmedApp) {
      setError('Currently Working Live App is required.');
      return;
    }
    if (!trimmedExp) {
      setError('Experience description is required.');
      return;
    }

    const payload: AdminCreateApplicationPayload = {
      name: trimmedName,
      country: countryObj.label,
      countryFlag: countryObj.flag,
      countryName: countryObj.name,
      whatsapp: trimmedWhatsapp,
      position,
      currentApp: trimmedApp,
      workExperience: trimmedExp,
      status,
      ...(cvFile ? { cvFile } : {}),
    };

    if (position === 'Super Admin') {
      const parsedAdmins = Number(adminsCount);
      const parsedAgencies = Number(agenciesCount);
      if (!Number.isInteger(parsedAdmins) || parsedAdmins < 0) {
        setError('Number of Admins must be a whole number (0 or higher).');
        return;
      }
      if (!Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
        setError('Number of Agencies must be a whole number (0 or higher).');
        return;
      }
      payload.adminsCount = parsedAdmins;
      payload.agenciesCount = parsedAgencies;
    } else if (position === 'Admin') {
      const parsedAgencies = Number(agenciesCount);
      if (!Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
        setError('Number of Agencies must be a whole number (0 or higher).');
        return;
      }
      payload.agenciesCount = parsedAgencies;
    } else if (position === 'Coin Seller') {
      payload.coinPackage = coinPackage;
    }

    setSubmitting(true);
    try {
      await onCreate(payload);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-app-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="add-app-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Add New Application (Admin Entry)
              </h2>
              <p className="text-xs text-slate-500">
                Manually record a candidate application into the database &amp; Google Sheets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Candidate full name"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Country <span className="text-red-600">*</span>
              </label>
              <CountrySelector
                value={selectedCountry}
                onChange={(c) => setSelectedCountry(c)}
                placeholder="Select country"
                searchPlaceholder="Search country..."
                emptySearch="No country found"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Number <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+880 1712 345678"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applied Position <span className="text-red-600">*</span>
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as RolePosition)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Coin Seller">Coin Seller</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currently Working Live App <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={currentApp}
                onChange={(e) => setCurrentApp(e.target.value)}
                placeholder="e.g. Poppo Live, Bigo Live, ZoZo Live"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {position === 'Super Admin' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Admins <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={adminsCount}
                    onChange={(e) => setAdminsCount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Agencies <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={agenciesCount}
                    onChange={(e) => setAgenciesCount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </>
            )}

            {position === 'Admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Agencies <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={agenciesCount}
                  onChange={(e) => setAgenciesCount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            )}

            {position === 'Coin Seller' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coin Selling Package <span className="text-red-600">*</span>
                </label>
                <select
                  value={coinPackage}
                  onChange={(e) => setCoinPackage(e.target.value as CoinPackageOption)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
                >
                  {COIN_PACKAGE_OPTIONS.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {position === 'Coin Seller' ? 'Coin Selling Experience' : 'Work Experience'}{' '}
              <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={workExperience}
              onChange={(e) => setWorkExperience(e.target.value)}
              placeholder="Summarize candidate experience..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CV File (Optional — PDF, DOC, DOCX up to 5 MB)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#4F46E5]" aria-hidden="true" />
                <span>{cvFile ? 'Replace CV File' : 'Attach CV File'}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleCvPick(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {cvFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-950">
                  <FileText className="w-3.5 h-3.5 text-[#4F46E5]" aria-hidden="true" />
                  <span className="font-medium truncate max-w-[200px]">{cvFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    aria-label="Remove attached CV"
                    className="text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{submitting ? 'Adding...' : 'Add Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
