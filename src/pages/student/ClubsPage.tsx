import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Club, ClubCategory } from '../../types'
import ClubCard from '../../components/shared/ClubCard'
import { SearchInput, Skeleton, EmptyState } from '../../components/ui'
import { Layers } from 'lucide-react'

const categories: { value: ClubCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '✦' },
  { value: 'technology', label: 'Technology', emoji: '💻' },
  { value: 'arts', label: 'Arts', emoji: '🎨' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'environment', label: 'Environment', emoji: '🌱' },
  { value: 'other', label: 'Other', emoji: '🎯' },
]

export default function ClubsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [clubs, setClubs] = useState<Club[]>([])
  const [memberships, setMemberships] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ClubCategory | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const { data, error } = await supabase.from('clubs_with_member_count').select('*').eq('is_approved', true)
        if (cancelled) return
        if (error) toast('Failed to load clubs', 'error')
        else setClubs(data || [])
        if (profile) {
          const { data: mems } = await supabase.from('club_members').select('club_id, status').eq('user_id', profile.id)
          if (cancelled) return
          const map: Record<string, string> = {}
          mems?.forEach(m => { map[m.club_id] = m.status })
          setMemberships(map)
        }
      } catch {
        if (!cancelled) toast('Failed to load clubs', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = async (clubId: string) => {
    if (!profile) return
    const { error } = await supabase.from('club_members').insert({ club_id: clubId, user_id: profile.id, status: 'pending' })
    if (error) toast('Failed to apply', 'error')
    else { toast('Application submitted!', 'success'); setMemberships(m => ({ ...m, [clubId]: 'pending' })) }
  }

  const filtered = clubs.filter(c =>
    (category === 'all' || c.category === category) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#1e1e1e]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="fade-up">
            <p className="text-xs font-bold text-[#ababab] uppercase tracking-widest mb-1">Explore</p>
            <h1 className="font-serif text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-1">Club Directory</h1>
            <p className="text-sm text-[#ababab]">{clubs.length} clubs available at E-JUST</p>
          </div>

          {/* Search + Filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:max-w-xs">
              <SearchInput value={search} onChange={setSearch} placeholder="Search clubs..." />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-semibold transition-all duration-150
                    ${category === cat.value
                      ? 'bg-[#C0121F] text-white border-[#C0121F]'
                      : 'border-[#ebebeb] text-[#6b6b6b] hover:border-[#d4d4d4] dark:border-[#252525] dark:text-[#909090] dark:hover:border-[#333]'
                    }`}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-up">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Layers />} title="No clubs found" description="Try adjusting your search or category filter." />
        ) : (
          <>
            <p className="text-xs text-[#ababab] font-semibold mb-5">{filtered.length} {filtered.length === 1 ? 'club' : 'clubs'} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(club => (
                <ClubCard
                  key={club.id}
                  club={club}
                  memberStatus={(memberships[club.id] as 'none' | 'pending' | 'approved') || 'none'}
                  onApply={() => handleApply(club.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
