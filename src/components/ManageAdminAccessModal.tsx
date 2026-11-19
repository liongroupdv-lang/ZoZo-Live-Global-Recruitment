import { Lock, Shield, Trash2, UserPlus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminAccessEntry, AdminPermissionLevel } from '../types/recruitment';

interface ManageAdminAccessModalProps {
  open: boolean;
  onClose: () => void;
  ownerEmail: string;
  actorEmail: string;
  actorRole: AdminPermissionLevel;
  entries: AdminAccessEntry[];
  onGrantAccess: (
    email: string,
    role: 'Viewer' | 'Editor',
    canDelete: boolean
  ) => Promise<void>;
  onRevokeAccess: (email: string) => Promise<void>;
}

export function ManageAdminAccessModal({
  open,
  onClose,
  ownerEmail,
  actorEmail,
  actorRole,
  entries,
  onGrantAccess,
  onRevokeAccess,
}: ManageAdminAccessModalProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'Viewer' | 'Editor'>('Viewer');
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const isOwner = actorRole === 'Owner';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const cleaned = newEmail.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError('Enter a valid Gmail address.');
      return;
    }

    setBusy(true);
    try {
      await onGrantAccess(cleaned, newRole, newRole === 'Editor' ? newCanDelete : false);
      setNewEmail('');
      setNewCanDelete(false);
      setNotice(`Saved ${newRole} permissions for ${cleaned}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update access.');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeRole = async (
    entry: AdminAccessEntry,
    role: 'Viewer' | 'Editor',
    canDelete: boolean
  ) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await onGrantAccess(entry.email, role, role === 'Editor' ? canDelete : false);
      setNotice(`Updated ${entry.email} to ${role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (email: string) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await onRevokeAccess(email);
      setNotice(`Revoked admin access for ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke access.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-admin-access-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#4C1D95]" aria-hidden="true" />
            <div>
              <h2
                id="manage-admin-access-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Manage Admin Access
              </h2>
              <p className="text-xs text-slate-500">
                Signed in as <span className="font-mono text-slate-700">{actorEmail}</span> ({actorRole})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Manage Admin Access"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {!isOwner && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Only the primary Owner (<span className="font-mono">{ownerEmail}</span>) can add,
                modify, or revoke administrator permissions.
              </span>
            </div>
          )}

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

          {/* Grant Access Form (Owner Only) */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Authorize Team Member by Gmail
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={!isOwner || busy}
                placeholder="teammate@gmail.com"
                className="sm:col-span-6 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 focus:outline-none focus:border-[#4C1D95]"
              />
              <select
                aria-label="Permission level"
                value={newRole}
                onChange={(e) => {
                  const val = e.target.value as 'Viewer' | 'Editor';
                  setNewRole(val);
                  if (val === 'Viewer') setNewCanDelete(false);
                }}
                disabled={!isOwner || busy}
                className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#4C1D95]"
              >
                <option value="Viewer">Viewer Access</option>
                <option value="Editor">Editor Access</option>
              </select>
              <button
                type="submit"
                disabled={!isOwner || busy}
                className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Grant Access</span>
              </button>
            </div>

            {newRole === 'Editor' && isOwner && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCanDelete}
                  onChange={(e) => setNewCanDelete(e.target.checked)}
                  className="rounded border-slate-300 text-[#4C1D95] focus:ring-[#4C1D95]"
                />
                <span>Explicitly allow this Editor to delete application records</span>
              </label>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-500 pt-1">
              <div>
                <span className="font-semibold text-slate-700">VIEWER:</span> View applications,
                applicant details, and authorized CV files. Cannot edit, delete, or manage access.
              </div>
              <div>
                <span className="font-semibold text-slate-700">EDITOR:</span> View, edit applicant
                info, and change status. Cannot delete records or manage permissions unless explicitly authorized above.
              </div>
            </div>
          </form>

          {/* Authorized Administrators List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Authorized Administrators ({entries.length})
            </div>
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const entryIsOwner = entry.role === 'Owner';
                return (
                  <div
                    key={entry.email}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{entry.email}</div>
                      <div className="text-xs text-slate-500">
                        {entry.role === 'Owner'
                          ? 'Primary Owner · Full Control'
                          : entry.role === 'Editor'
                          ? `Editor Access · View & Edit${entry.canDelete ? ' · Delete Authorized' : ''}`
                          : 'Viewer Access · Read-Only'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {entryIsOwner ? (
                        <span className="text-xs font-semibold text-[#4C1D95]">Owner</span>
                      ) : isOwner ? (
                        <>
                          <select
                            aria-label={`Change role for ${entry.email}`}
                            value={entry.role}
                            disabled={busy}
                            onChange={(e) =>
                              handleChangeRole(
                                entry,
                                e.target.value as 'Viewer' | 'Editor',
                                e.target.value === 'Editor' ? Boolean(entry.canDelete) : false
                              )
                            }
                            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                          >
                            <option value="Viewer">Viewer</option>
                            <option value="Editor">Editor</option>
                          </select>
                          {entry.role === 'Editor' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleChangeRole(entry, 'Editor', !entry.canDelete)
                              }
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border cursor-pointer ${
                                entry.canDelete
                                  ? 'bg-violet-50 border-[#4C1D95] text-[#4C1D95]'
                                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {entry.canDelete ? 'Can Delete: Yes' : 'Can Delete: No'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRevoke(entry.email)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Revoke</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            entry.role === 'Editor' ? 'text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          {entry.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
