import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_COUNTRIES } from '../data/countries';
import { COIN_PACKAGE_OPTIONS } from '../data/translations';
import { downloadCvFromFirestore } from '../lib/firestoreDb';
import type {
  AdminAccessEntry,
  AdminCreateApplicationPayload,
  AdminPermissionLevel,
  ApplicationStatus,
  BackendConfig,
  CoinPackageOption,
  EmailNotificationRecord,
  RecruitmentApplication,
  RolePosition,
  UpdateApplicationPayload,
} from '../types/recruitment';
import { AddApplicationModal } from './AddApplicationModal';
import { ConfirmModal } from './ConfirmModal';
import { EmailNotificationsPanel } from './EmailNotificationsPanel';
import { ManageAdminAccessModal } from './ManageAdminAccessModal';

interface ApplicationsDashboardProps {
  applications: RecruitmentApplication[];
  loading: boolean;
  error: string;
  initialSelectedId?: string | null;
  accessToken: string;
  onCreateApplication: (payload: AdminCreateApplicationPayload) => Promise<RecruitmentApplication>;
  onUpdateApplication: (id: string, payload: UpdateApplicationPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  ownerEmail: string;
  actorEmail: string;
  actorRole: AdminPermissionLevel;
  canDelete: boolean;
  adminEntries: AdminAccessEntry[];
  onGrantAccess: (
    email: string,
    role: 'Viewer' | 'Editor',
    canDelete: boolean
  ) => Promise<void>;
  onRevokeAccess: (email: string) => Promise<void>;
  notifications: EmailNotificationRecord[];
  backendConfig: BackendConfig;
  onSendTestNotification: (language: 'en' | 'bn') => Promise<EmailNotificationRecord | undefined>;
  onSaveGmailSettings: (email: string, appPassword: string) => Promise<void>;
  onClearGmailSettings: () => Promise<void>;
}

type RoleFilter = 'All' | RolePosition;

const ROLE_TABS: RoleFilter[] = ['All', 'Super Admin', 'Admin', 'Coin Seller'];
const STATUS_OPTIONS: ApplicationStatus[] = ['Pending', 'Under Review', 'Approved', 'Rejected'];

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case 'Pending':
      return 'text-amber-700';
    case 'Under Review':
      return 'text-sky-700';
    case 'Approved':
      return 'text-emerald-700';
    case 'Rejected':
      return 'text-red-700';
  }
}

function getWhatsAppHref(number: string): string {
  const digits = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRoleSpecificSummary(app: RecruitmentApplication): string {
  if (app.position === 'Super Admin') {
    return `${app.adminsCount ?? 0} Admins · ${app.agenciesCount ?? 0} Agencies`;
  }
  if (app.position === 'Admin') {
    return `${app.agenciesCount ?? 0} Agencies`;
  }
  return app.coinPackage ? `Target ${app.coinPackage}` : '—';
}

export function ApplicationsDashboard({
  applications,
  loading,
  error,
  initialSelectedId = null,
  accessToken,
  onCreateApplication,
  onUpdateApplication,
  onDelete,
  ownerEmail,
  actorEmail,
  actorRole,
  canDelete,
  adminEntries,
  onGrantAccess,
  onRevokeAccess,
  notifications,
  backendConfig,
  onSendTestNotification,
  onSaveGmailSettings,
  onClearGmailSettings,
}: ApplicationsDashboardProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);

  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<UpdateApplicationPayload>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [pendingDeleteApp, setPendingDeleteApp] = useState<RecruitmentApplication | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const canModify = actorRole === 'Owner' || actorRole === 'Editor';
  const isAllowedToDelete = actorRole === 'Owner' || (actorRole === 'Editor' && canDelete);

  const metrics = useMemo(() => {
    const counts = {
      total: applications.length,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      superAdmin: 0,
      admin: 0,
      coinSeller: 0,
    };
    for (const app of applications) {
      if (app.status === 'Pending') counts.pending++;
      else if (app.status === 'Under Review') counts.underReview++;
      else if (app.status === 'Approved') counts.approved++;
      else if (app.status === 'Rejected') counts.rejected++;

      if (app.position === 'Super Admin') counts.superAdmin++;
      else if (app.position === 'Admin') counts.admin++;
      else if (app.position === 'Coin Seller') counts.coinSeller++;
    }
    return counts;
  }, [applications]);

  const availableCountries = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of applications) {
      const label = app.countryName || app.country;
      if (!map.has(label)) {
        map.set(label, app.country);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [applications]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (roleFilter !== 'All' && app.position !== roleFilter) return false;
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (countryFilter !== 'All' && (app.countryName || app.country) !== countryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        app.id.toLowerCase().includes(q) ||
        app.name.toLowerCase().includes(q) ||
        app.country.toLowerCase().includes(q) ||
        app.whatsapp.toLowerCase().includes(q) ||
        app.currentApp.toLowerCase().includes(q)
      );
    });
  }, [applications, roleFilter, statusFilter, countryFilter, searchQuery]);

  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === selectedId) ?? null,
    [applications, selectedId]
  );

  const startEditing = (app: RecruitmentApplication) => {
    setActionError('');
    setEditDraft({
      name: app.name,
      country: app.country,
      countryFlag: app.countryFlag,
      countryName: app.countryName,
      whatsapp: app.whatsapp,
      position: app.position,
      currentApp: app.currentApp,
      adminsCount: app.adminsCount,
      agenciesCount: app.agenciesCount,
      coinPackage: app.coinPackage,
      workExperience: app.workExperience,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedApplication) return;
    setSavingEdit(true);
    setActionError('');
    try {
      await onUpdateApplication(selectedApplication.id, editDraft);
      setEditing(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save application edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownloadCv = async (app: RecruitmentApplication) => {
    setActionError('');
    setDownloadingCvId(app.id);
    try {
      const res = await fetch(`/api/admin/cv/${encodeURIComponent(app.id)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = app.cvFileName || `${app.id}-cv.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Fallback: reassemble CV from Cloud Firestore chunks (for cross-host submissions e.g. Render)
      const fsCv = await downloadCvFromFirestore(app.id);
      if (fsCv?.base64) {
        const binary = atob(fsCv.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: app.cvMimeType || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = app.cvFileName || `${app.id}-cv.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Unable to download CV file.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'CV download failed.');
    } finally {
      setDownloadingCvId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteApp) return;
    setDeletingBusy(true);
    setActionError('');
    try {
      await onDelete(pendingDeleteApp.id);
      if (selectedId === pendingDeleteApp.id) {
        setSelectedId(null);
        setEditing(false);
      }
      setPendingDeleteApp(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete application.');
      setPendingDeleteApp(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Application ID',
      'Submission Date',
      'Full Name',
      'Country',
      'WhatsApp Number',
      'Applied Position',
      'Currently Working Live App',
      'Number of Admins',
      'Number of Agencies',
      'Coin Selling Package',
      'Work / Coin Experience',
      'CV File Link',
      'Application Status',
    ];
    const escapeCell = (val: string | number | undefined) =>
      `"${String(val ?? '—').replace(/"/g, '""')}"`;

    const rows = filtered.map((app) =>
      [
        app.id,
        app.submittedAt,
        app.name,
        app.country,
        app.whatsapp,
        app.position,
        app.currentApp,
        app.position === 'Super Admin' ? app.adminsCount ?? 0 : '—',
        app.position === 'Super Admin' || app.position === 'Admin'
          ? app.agenciesCount ?? 0
          : '—',
        app.position === 'Coin Seller' ? app.coinPackage || '—' : '—',
        app.workExperience,
        app.driveCvUrl || app.cvFileName || app.cvLink,
        app.status,
      ]
        .map(escapeCell)
        .join(',')
    );

    const csv = [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = roleFilter.toLowerCase().replace(/\s+/g, '-');
    link.download = `zozo-live-applications-${slug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-2">
            <span>Private Recruitment Database</span>
            <span aria-hidden="true">·</span>
            <span>{actorEmail}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#4F46E5]">{actorRole}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Admin Recruitment Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review applications, inspect CVs, update statuses, and copy the public link to share.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canModify && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Application</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <Mail className="w-3.5 h-3.5 text-[#4F46E5]" aria-hidden="true" />
            <span>Email Notifications ({notifications.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAccessModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#4F46E5]" aria-hidden="true" />
            <span>Manage Admin Access</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 8-Metric KPI Grid (Includes Under Review) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {metrics.total}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Pending</div>
          <div className="mt-1 font-display text-2xl font-bold text-amber-700 tabular-nums">
            {metrics.pending}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Under Review</div>
          <div className="mt-1 font-display text-2xl font-bold text-sky-700 tabular-nums">
            {metrics.underReview}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Approved</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {metrics.approved}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Rejected</div>
          <div className="mt-1 font-display text-2xl font-bold text-red-700 tabular-nums">
            {metrics.rejected}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Super Admin</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#7C3AED] tabular-nums">
            {metrics.superAdmin}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Admin</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2563EB] tabular-nums">
            {metrics.admin}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">Coin Seller</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#0891B2] tabular-nums">
            {metrics.coinSeller}
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter applications by position"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full"
          >
            {ROLE_TABS.map((tab) => {
              const active = roleFilter === tab;
              const count =
                tab === 'All'
                  ? metrics.total
                  : tab === 'Super Admin'
                  ? metrics.superAdmin
                  : tab === 'Admin'
                  ? metrics.admin
                  : metrics.coinSeller;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRoleFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    active
                      ? 'bg-white text-[#4F46E5] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applicant name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <select
              aria-label="Filter by country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="All">All Countries</option>
              {availableCountries.map(([nameKey, fullLabel]) => (
                <option key={nameKey} value={nameKey}>
                  {fullLabel}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'All' | ApplicationStatus)
              }
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(error || actionError) && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
            {actionError || error}
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="font-display text-base font-semibold text-slate-900">
              {applications.length === 0
                ? 'No applications received yet'
                : 'No applications match your active filters'}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
              {applications.length === 0
                ? 'Share the public application link to start receiving candidates in Google Sheets and here.'
                : 'Adjust your position, country, status, or search filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Internal ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Applicant</th>
                  <th className="py-3 px-4 whitespace-nowrap">Country</th>
                  <th className="py-3 px-4 whitespace-nowrap">Position</th>
                  <th className="py-3 px-4 whitespace-nowrap">Current Live App</th>
                  <th className="py-3 px-4 whitespace-nowrap">Role Details</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((app) => {
                  const isSelected = app.id === selectedId;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setSelectedId(app.id);
                        setEditing(false);
                        setActionError('');
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {app.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {app.name}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {app.whatsapp}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <span className="mr-1.5" aria-hidden="true">
                          {app.countryFlag}
                        </span>
                        <span>{app.countryName}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {app.position}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {app.currentApp}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatRoleSpecificSummary(app)}
                      </td>
                      <td className={`py-3 px-4 font-semibold whitespace-nowrap ${getStatusColor(app.status)}`}>
                        {app.status}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(app.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Application Detail & Edit Panel */}
      {selectedApplication && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-[#4F46E5]">
                  {selectedApplication.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedApplication.position}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatShortDate(selectedApplication.submittedAt)}
                </span>
                {selectedApplication.sourceOrigin && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {selectedApplication.sourceOrigin.replace(/^https?:\/\//, '')}
                    </span>
                  </>
                )}
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                {selectedApplication.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {canModify && !editing && (
                <button
                  type="button"
                  onClick={() => startEditing(selectedApplication)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Info</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setEditing(false);
                }}
                aria-label="Close application details"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editDraft.name ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <select
                    value={editDraft.country ?? ''}
                    onChange={(e) => {
                      const found = ALL_COUNTRIES.find((c) => c.label === e.target.value);
                      if (found) {
                        setEditDraft((d) => ({
                          ...d,
                          country: found.label,
                          countryFlag: found.flag,
                          countryName: found.name,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editDraft.whatsapp ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applied Position
                  </label>
                  <select
                    value={editDraft.position ?? 'Super Admin'}
                    onChange={(e) =>
                      setEditDraft((d) => ({
                        ...d,
                        position: e.target.value as RolePosition,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Coin Seller">Coin Seller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currently Working Live App
                  </label>
                  <input
                    type="text"
                    value={editDraft.currentApp ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, currentApp: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                {editDraft.position === 'Super Admin' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Number of Admins
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.adminsCount ?? 0}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, adminsCount: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                {(editDraft.position === 'Super Admin' || editDraft.position === 'Admin') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Number of Agencies
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.agenciesCount ?? 0}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, agenciesCount: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                {editDraft.position === 'Coin Seller' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Coin Selling Package
                    </label>
                    <select
                      value={editDraft.coinPackage ?? '$500'}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          coinPackage: e.target.value as CoinPackageOption,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
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
                  {editDraft.position === 'Coin Seller'
                    ? 'Coin Selling Experience'
                    : 'Work Experience'}
                </label>
                <textarea
                  rows={3}
                  value={editDraft.workExperience ?? ''}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, workExperience: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Country</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {selectedApplication.countryFlag} {selectedApplication.countryName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">WhatsApp Number</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-slate-900">
                    {selectedApplication.whatsapp}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Currently Working Live App</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {selectedApplication.currentApp}
                  </dd>
                </div>
                {selectedApplication.position === 'Super Admin' && (
                  <>
                    <div>
                      <dt className="text-xs text-slate-500">Number of Admins</dt>
                      <dd className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
                        {selectedApplication.adminsCount ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Number of Agencies</dt>
                      <dd className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
                        {selectedApplication.agenciesCount ?? 0}
                      </dd>
                    </div>
                  </>
                )}
                {selectedApplication.position === 'Admin' && (
                  <div>
                    <dt className="text-xs text-slate-500">Number of Agencies</dt>
                    <dd className="mt-0.5 font-mono tabular-nums font-medium text-slate-900">
                      {selectedApplication.agenciesCount ?? 0}
                    </dd>
                  </div>
                )}
                {selectedApplication.position === 'Coin Seller' && (
                  <div>
                    <dt className="text-xs text-slate-500">Coin Selling Package</dt>
                    <dd className="mt-0.5 font-mono tabular-nums font-semibold text-[#0E7490]">
                      {selectedApplication.coinPackage || '—'}
                    </dd>
                  </div>
                )}
              </dl>

              <div>
                <h3 className="text-xs font-semibold text-slate-500">
                  {selectedApplication.position === 'Coin Seller'
                    ? 'Coin Selling Experience'
                    : 'Work Experience'}
                </h3>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedApplication.workExperience}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#4F46E5] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {selectedApplication.cvFileName || 'Applicant CV File'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {selectedApplication.cvFileSize > 0
                        ? `${formatFileSize(selectedApplication.cvFileSize)}${
                            selectedApplication.driveCvUrl
                              ? ' · Stored in Private Google Drive'
                              : ' · Stored Privately'
                          }`
                        : 'Manual Admin Entry · No CV attached'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedApplication.cvFileSize > 0 && (
                    <button
                      type="button"
                      disabled={downloadingCvId === selectedApplication.id}
                      onClick={() => handleDownloadCv(selectedApplication)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {downloadingCvId === selectedApplication.id
                          ? 'Downloading...'
                          : 'Open / Download CV'}
                      </span>
                    </button>
                  )}
                  {selectedApplication.driveCvUrl && (
                    <a
                      href={selectedApplication.driveCvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                    >
                      <span>Open in Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <a
              href={getWhatsAppHref(selectedApplication.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Contact on WhatsApp</span>
            </a>

            {canModify ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Status</span>
                  <select
                    value={selectedApplication.status}
                    disabled={updatingId === selectedApplication.id}
                    onChange={async (e) => {
                      const next = e.target.value as ApplicationStatus;
                      setUpdatingId(selectedApplication.id);
                      setActionError('');
                      try {
                        await onUpdateApplication(selectedApplication.id, { status: next });
                      } catch (err) {
                        setActionError(
                          err instanceof Error ? err.message : 'Unable to update status.'
                        );
                      } finally {
                        setUpdatingId(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                {isAllowedToDelete && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteApp(selectedApplication)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs font-medium text-slate-500">
                Viewer Access (Read-Only · Cannot edit or delete)
              </div>
            )}
          </div>
        </div>
      )}

      <ManageAdminAccessModal
        open={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        ownerEmail={ownerEmail}
        actorEmail={actorEmail}
        actorRole={actorRole}
        entries={adminEntries}
        onGrantAccess={onGrantAccess}
        onRevokeAccess={onRevokeAccess}
      />

      <EmailNotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        ownerEmail={ownerEmail}
        actorRole={actorRole}
        backendConfig={backendConfig}
        notifications={notifications}
        onSendTest={onSendTestNotification}
        onSaveGmailSettings={onSaveGmailSettings}
        onClearGmailSettings={onClearGmailSettings}
      />

      <ConfirmModal
        open={pendingDeleteApp !== null}
        title="Delete Recruitment Application?"
        description={
          pendingDeleteApp
            ? `Permanently delete ${pendingDeleteApp.name}'s application (${pendingDeleteApp.id}) and remove its uploaded CV file? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Application"
        destructive
        busy={deletingBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deletingBusy) setPendingDeleteApp(null);
        }}
      />
      <AddApplicationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreate={async (payload) => {
          const created = await onCreateApplication(payload);
          setSelectedId(created.id);
          setEditing(false);
        }}
      />
    </div>
  );
}
