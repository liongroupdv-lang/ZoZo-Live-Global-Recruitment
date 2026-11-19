import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
            )}
            <div>
              <h2
                id="confirm-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#4C1D95] hover:bg-[#5B21B6]'
            }`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
