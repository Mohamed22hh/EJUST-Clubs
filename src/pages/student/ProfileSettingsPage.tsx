import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { PageHeader, Skeleton } from '../../components/ui'
import { Bell, User } from 'lucide-react'

const majors = ['Computer Science', 'Engineering', 'Architecture', 'Business', 'Environmental Sciences', 'Mechatronics', 'Energy Engineering', 'Other']

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ full_name: '', major: '', year: '1' })
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name || '',
      major: profile.major || '',
      year: String(profile.year || 1),
    })
    setEmailNotifs(profile.email_notifications_enabled ?? true)
    setLoading(false)
  }, [profile])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('users').update({
      full_name: form.full_name,
      major: form.major,
      year: parseInt(form.year),
    }).eq('id', profile.id)
    if (error) toast('Failed to save profile', 'error')
    else {
      await refreshProfile()
      toast('Profile updated!', 'success')
    }
    setSaving(false)
  }

  const handleToggleEmailNotifs = async (enabled: boolean) => {
    if (!profile) return
    setSavingNotifs(true)
    const { error } = await supabase.from('users').update({
      email_notifications_enabled: enabled,
    }).eq('id', profile.id)
    if (error) {
      toast('Failed to update preference', 'error')
    } else {
      setEmailNotifs(enabled)
      await refreshProfile()
      toast(enabled ? 'Email notifications enabled' : 'Email notifications disabled', 'success')
    }
    setSavingNotifs(false)
  }

  if (loading) return <div className="page-container"><Skeleton className="h-40" /></div>

  return (
    <div className="page-container fade-up">
      <PageHeader title="Profile & Settings" subtitle="Manage your account information and preferences" />

      <div className="max-w-2xl space-y-6">

        {/* Profile info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-xl bg-[rgba(192,18,31,0.1)] flex items-center justify-center text-[#C0121F]">
              <User size={18} />
            </div>
            <h2 className="font-serif text-lg text-[#0a0a0a] dark:text-[#f0f0f0]">Personal Information</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.full_name} onChange={set('full_name')} required />
            </div>

            <div>
              <label className="label">Email</label>
              <input className="input" value={profile?.email || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <p className="text-xs text-[#ababab] mt-1">Email cannot be changed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Major</label>
                <select className="input" value={form.major} onChange={set('major')}>
                  <option value="">Select major</option>
                  {majors.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input" value={form.year} onChange={set('year')}>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-fit">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Notification preferences */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-xl bg-[rgba(192,18,31,0.1)] flex items-center justify-center text-[#C0121F]">
              <Bell size={18} />
            </div>
            <h2 className="font-serif text-lg text-[#0a0a0a] dark:text-[#f0f0f0]">Notification Preferences</h2>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-[#e8e8e8] dark:border-[#252525] bg-[#fafafa] dark:bg-[#111]">
            <div>
              <div className="font-medium text-sm text-[#0a0a0a] dark:text-[#f0f0f0]">Email notifications</div>
              <div className="text-xs text-[#ababab] mt-0.5">Receive emails when your clubs post announcements or events</div>
            </div>
            <button
              onClick={() => handleToggleEmailNotifs(!emailNotifs)}
              disabled={savingNotifs}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${emailNotifs ? 'bg-[#C0121F]' : 'bg-[#d4d4d4] dark:bg-[#444]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${emailNotifs ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="card">
          <h2 className="font-serif text-lg text-[#0a0a0a] dark:text-[#f0f0f0] mb-4">Account</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-[#f4f4f4] dark:border-[#1e1e1e]">
              <span className="text-[#ababab]">Role</span>
              <span className="font-medium capitalize dark:text-[#f0f0f0]">{profile?.role.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#f4f4f4] dark:border-[#1e1e1e]">
              <span className="text-[#ababab]">Member since</span>
              <span className="font-medium dark:text-[#f0f0f0]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#ababab]">Account status</span>
              <span className={`font-medium ${profile?.is_approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                {profile?.is_approved ? 'Active' : 'Pending approval'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
