import React from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} style={{ minHeight: '1rem' }} />
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#f4f4f4] dark:bg-[#181818] flex items-center justify-center text-2xl mb-5 text-[#ababab]">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-2">{title}</h3>
      {description && <p className="text-sm text-[#ababab] mb-6 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div>
        <h1 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-[#ababab]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  technology: { bg: '#eff6ff', text: '#1d4ed8', border: 'rgba(59,130,246,0.2)' },
  arts:       { bg: '#faf5ff', text: '#7c3aed', border: 'rgba(139,92,246,0.2)' },
  sports:     { bg: '#f0fdf4', text: '#15803d', border: 'rgba(34,197,94,0.2)' },
  business:   { bg: '#fffbeb', text: '#b45309', border: 'rgba(245,158,11,0.2)' },
  environment:{ bg: '#ecfdf5', text: '#065f46', border: 'rgba(16,185,129,0.2)' },
  other:      { bg: '#f9fafb', text: '#374151', border: 'rgba(107,114,128,0.2)' },
}

export function CategoryBadge({ category }: { category: string }) {
  const c = categoryColors[category] || categoryColors.other
  return (
    <span className="badge capitalize" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {category}
    </span>
  )
}

const annColors: Record<string, { bg: string; text: string; border: string }> = {
  event:       { bg: '#eff6ff', text: '#1d4ed8', border: 'rgba(59,130,246,0.2)' },
  recruitment: { bg: '#fff1f2', text: '#C0121F', border: 'rgba(192,18,31,0.2)' },
  news:        { bg: '#fffbeb', text: '#b45309', border: 'rgba(245,158,11,0.2)' },
  general:     { bg: '#f9fafb', text: '#374151', border: 'rgba(107,114,128,0.2)' },
}

export function AnnBadge({ category }: { category: string }) {
  const c = annColors[category] || annColors.general
  return (
    <span className="badge capitalize" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {category}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === 'approved' ? 'badge-accepted'
    : status === 'pending' ? 'badge-pending'
    : 'badge-rejected'
  return <span className={`badge ${cls} capitalize`}>{status}</span>
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  const initial = name?.[0]?.toUpperCase() || '?'
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#C0121F] to-[#7a0b12]
                     flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initial}
    </div>
  )
}

export function DateBlock({ date }: { date: string }) {
  const d = new Date(date)
  const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
  const day = d.getDate()
  return (
    <div className="flex flex-col items-center justify-center w-12 shrink-0 rounded-xl overflow-hidden"
      style={{ border: '1.5px solid rgba(192,18,31,0.25)' }}>
      <div className="w-full text-center py-0.5 text-[9px] font-bold tracking-widest"
        style={{ background: '#C0121F', color: 'white' }}>
        {month}
      </div>
      <div className="py-1.5 font-serif text-xl text-[#C0121F] leading-none">{day}</div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ababab] pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        className="input"
        style={{ paddingLeft: '2.25rem' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
      />
    </div>
  )
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  )
}
