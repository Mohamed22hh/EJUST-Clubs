import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Announcement } from '../../types'
import { PageHeader, AnnBadge, Skeleton, EmptyState, Avatar } from '../../components/ui'
import { ArrowLeft, Tag, Clock } from 'lucide-react'

const filters = ['all', 'event', 'recruitment', 'news', 'general'] as const

function readingTime(text: string) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200))
}

function PostDetail({ ann, related, onBack }: { ann: Announcement; related: Announcement[]; onBack: () => void }) {
  return (
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#999] hover:text-[#0a0a0a] dark:hover:text-[#f0f0f0] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Announcements
      </button>
      <article className="max-w-3xl mx-auto">
        {ann.image_url && (
          <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-8">
            <img src={ann.image_url} alt={ann.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <AnnBadge category={ann.category} />
          <span className="flex items-center gap-1 text-xs text-[#999]"><Clock size={11} /> {readingTime(ann.body)} min read</span>
          <span className="text-xs text-[#999] ml-auto">{new Date(ann.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0a0a0a] dark:text-[#f0f0f0] leading-tight mb-6">{ann.title}</h1>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f4f4f4] dark:bg-[#181818] border border-[#e8e8e8] dark:border-[#252525] mb-8">
          <Avatar name={ann.author?.full_name || '?'} size="md" />
          <div>
            <div className="font-medium text-sm dark:text-[#f0f0f0]">{ann.author?.full_name}</div>
            {ann.author?.major && <div className="text-xs text-[#999]">{ann.author.major}</div>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ann.club?.logo_url
              ? <img src={ann.club.logo_url} alt={ann.club.name} className="h-7 w-7 rounded-lg object-cover" />
              : <span className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#C0121F' }}>C</span>
            }
            <span className="text-xs font-medium text-[#555] dark:text-[#a0a0a0]">{ann.club?.name}</span>
          </div>
        </div>
        <div>
          {ann.body.split('\n\n').map((para, i) => (
            para.trim() ? <p key={i} className="text-[#2a2a2a] dark:text-[#d0d0d0] leading-relaxed text-base mb-5">{para}</p> : null
          ))}
        </div>
        {ann.tags && ann.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-[#e8e8e8] dark:border-[#252525]">
            <Tag size={13} className="text-[#999]" />
            {ann.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#555] dark:text-[#a0a0a0] border border-[#e8e8e8] dark:border-[#2a2a2a]">{tag}</span>
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-5">More from {ann.club?.name}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(r => (
                <div key={r.id} className="card overflow-hidden p-0">
                  {r.image_url && <img src={r.image_url} alt={r.title} className="w-full h-32 object-cover" />}
                  <div className="p-4">
                    <AnnBadge category={r.category} />
                    <h3 className="font-medium text-sm dark:text-[#f5f5f5] mt-2 line-clamp-2">{r.title}</h3>
                    <p className="text-xs text-[#999] mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

function PostCard({ ann, onClick }: { ann: Announcement; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group card overflow-hidden p-0 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      {ann.image_url ? (
        <div className="w-full h-48 overflow-hidden">
          <img src={ann.image_url} alt={ann.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-full h-2 bg-gradient-to-r from-[#C0121F] to-[#7a0b12]" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AnnBadge category={ann.category} />
          <span className="flex items-center gap-1 text-xs text-[#999]"><Clock size={10} /> {readingTime(ann.body)} min read</span>
          <span className="ml-auto text-xs text-[#999]">{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <h2 className="font-serif text-lg text-[#0a0a0a] dark:text-[#f0f0f0] leading-snug mb-2 group-hover:text-[#C0121F] transition-colors line-clamp-2">{ann.title}</h2>
        <p className="text-sm text-[#555] dark:text-[#a0a0a0] line-clamp-3 leading-relaxed mb-4">{ann.body}</p>
        {ann.tags && ann.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ann.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090]">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
          <Avatar name={ann.author?.full_name || '?'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium dark:text-[#d0d0d0] truncate">{ann.author?.full_name}</div>
            {ann.author?.major && <div className="text-[10px] text-[#999] truncate">{ann.author.major}</div>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {ann.club?.logo_url
              ? <img src={ann.club.logo_url} alt={ann.club?.name} className="h-5 w-5 rounded object-cover" />
              : <span className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: '#C0121F' }}>C</span>
            }
            <span className="text-[11px] text-[#999] hidden sm:block truncate max-w-[90px]">{ann.club?.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [myClubIds, setMyClubIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<typeof filters[number]>('all')
  const [myClubs, setMyClubs] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    const load = async () => {
      try {
        const [annsRes, memRes] = await Promise.all([
          supabase.from('announcements')
            .select('*, club:clubs(name,logo_url), author:users(id,full_name,major,avatar_url)')
            .order('created_at', { ascending: false }),
          supabase.from('club_members').select('club_id').eq('user_id', profile.id).eq('status', 'approved'),
        ])
        if (cancelled) return
        if (annsRes.error) toast('Failed to load announcements', 'error')
        else setAnnouncements((annsRes.data as Announcement[]) || [])
        setMyClubIds(memRes.data?.map(m => m.club_id) || [])
      } catch { if (!cancelled) toast('Failed to load announcements', 'error') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = announcements.filter(a => {
    if (myClubs && !myClubIds.includes(a.club_id)) return false
    if (filter !== 'all' && a.category !== filter) return false
    return true
  })

  const related = selected
    ? announcements.filter(a => a.club_id === selected.club_id && a.id !== selected.id).slice(0, 2)
    : []

  if (selected) {
    return (
      <div className="page-container">
        <PostDetail ann={selected} related={related} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="Announcements" subtitle="Stories and news from E-JUST clubs" />
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize transition-colors
                ${filter === f ? 'bg-[#C0121F] text-white border-[#C0121F]' : 'border-[#e8e8e8] text-[#555] dark:border-[#2a2a2a] dark:text-[#a0a0a0]'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <button onClick={() => setMyClubs(v => !v)}
          className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors
            ${myClubs ? 'bg-[#0f0f0f] text-white border-[#0f0f0f] dark:bg-white dark:text-[#0a0a0a]' : 'border-[#e8e8e8] text-[#555] dark:border-[#2a2a2a] dark:text-[#a0a0a0]'}`}>
          My Clubs Only
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState title="No announcements" description="Nothing to show here yet" />
      ) : (
        <>
          {/* Featured post */}
          <div onClick={() => setSelected(displayed[0])}
            className="group card overflow-hidden p-0 cursor-pointer hover:shadow-xl transition-all duration-200 mb-8">
            <div className="md:flex">
              {displayed[0].image_url ? (
                <div className="md:w-1/2 h-56 md:h-auto overflow-hidden">
                  <img src={displayed[0].image_url} alt={displayed[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="md:w-1/2 h-48 md:h-auto bg-gradient-to-br from-[#C0121F] to-[#7a0b12] flex items-center justify-center">
                  <span className="font-serif text-white/20 text-8xl">E</span>
                </div>
              )}
              <div className="md:w-1/2 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AnnBadge category={displayed[0].category} />
                    <span className="text-xs font-bold text-[#C0121F] uppercase tracking-widest">Featured</span>
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] leading-snug mb-3 group-hover:text-[#C0121F] transition-colors">{displayed[0].title}</h2>
                  <p className="text-sm text-[#555] dark:text-[#a0a0a0] line-clamp-3 leading-relaxed mb-4">{displayed[0].body}</p>
                  {displayed[0].tags && displayed[0].tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {displayed[0].tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-[#f0f0f0] dark:border-[#252525]">
                  <Avatar name={displayed[0].author?.full_name || '?'} size="sm" />
                  <div>
                    <div className="text-xs font-medium dark:text-[#d0d0d0]">{displayed[0].author?.full_name}</div>
                    <div className="text-[10px] text-[#999]">{new Date(displayed[0].created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {readingTime(displayed[0].body)} min read</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Grid */}
          {displayed.length > 1 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayed.slice(1).map(ann => (
                <PostCard key={ann.id} ann={ann} onClick={() => setSelected(ann)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
