import { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-[#161616] rounded-2xl border border-[#ebebeb] dark:border-[#252525] p-6 shadow-2xl fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-[#C0121F]' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">{title}</h3>
            <p className="text-sm text-[#6b6b6b] dark:text-[#909090] leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm py-2 px-4">Cancel</button>
          <button
            onClick={onConfirm}
            className={`text-sm py-2 px-4 rounded-xl font-medium transition-all ${
              danger
                ? 'bg-[#C0121F] text-white hover:bg-[#a00f1a]'
                : 'bg-[#0a0a0a] dark:bg-[#f0f0f0] text-white dark:text-[#0a0a0a] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
