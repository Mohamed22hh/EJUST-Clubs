import { useEffect, useState } from 'react'
import { MapPin, Users, Calendar, ArrowLeft, Tag, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Event } from '../../types'
import { PageHeader, DateBlock, Skeleton, EmptyState, Avatar } from '../../components/ui'

// ─── Event Detail (blog post layout) ────────────────────────────────────────
function EventDetail({ ev, rsvpd, toggling, onToggle, onBack }: {
  ev: Event
  rsvpd: boolean
  toggling: boolean
  onToggle: () => void
  onBack: () => void
}) {
  const eventDate = new Date(ev.event_date)
  const isPast = eventDate < new Date()

  return (
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#999] hover:text-[#0a0a0a] dark:hover:text-[#f0f0f0] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Events
      </button>

      <article className="max-w-3xl mx-auto">
        {/* Hero */}
        {ev.image_url ? (
          <div className="w-full h-72 md:h-[420px] rounded-2xl overflow-hidden mb-8">
            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-[#C0121F] to-[#7a0b12] flex items-center justify-center mb-8">
            <Calendar size={48} className="text-white/30" />
          </div>
        )}

        {/* Date + RSVP row */}
        <div className="flex items-center gap-4 mb-6">
          <DateBlock date={ev.event_date} />
          <div className="flex-1">
            <div className="text-sm font-semibold dark:text-[#f0f0f0]">
              {eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-xs text-[#999]">{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          {!isPast && (
            <button
              onClick={onToggle}
              disabled={toggling}
              className={rsvpd ? 'btn-ghost py-2 px-4' : 'btn-primary py-2 px-4'}
            >
              {toggling ? '...' : rsvpd ? 'Cancel RSVP' : 'RSVP Now'}
            </button>
          )}
        </div>

        <h1 className="font-serif text-3xl md:text-4xl text-[#0a0a0a] dark:text-[#f0f0f0] leading-tight mb-4">{ev.title}</h1>

        {/* Meta info card */}
        <div className="grid sm:grid-cols-3 gap-3 p-5 rounded-2xl bg-[#f4f4f4] dark:bg-[#181818] border border-[#e8e8e8] dark:border-[#252525] mb-8">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-[#C0121F] mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-widest font-semibold mb-0.5">Location</div>
              <div className="text-sm font-medium dark:text-[#f0f0f0]">{ev.location}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users size={14} className="text-[#C0121F] mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-widest font-semibold mb-0.5">Attending</div>
              <div className="text-sm font-medium dark:text-[#f0f0f0]">{ev.rsvp_count ?? 0} going</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            {ev.club?.logo_url
              ? <img src={ev.club.logo_url} alt={ev.club.name} className="h-4 w-4 rounded mt-0.5 object-cover shrink-0" />
              : <span className="h-4 w-4 rounded mt-0.5 flex items-center justify-center text-white text-[8px] font-bold shrink-0" style={{ backgroundColor: '#C0121F' }}>C</span>
            }
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-widest font-semibold mb-0.5">Organiser</div>
              <div className="text-sm font-medium dark:text-[#f0f0f0]">{ev.club?.name}</div>
            </div>
          </div>
        </div>

        {/* Author */}
        {ev.author && (
          <div className="flex items-center gap-3 mb-8">
            <Avatar name={ev.author.full_name || '?'} size="md" />
            <div>
              <div className="text-sm font-medium dark:text-[#f0f0f0]">Posted by {ev.author.full_name}</div>
              {ev.author.major && <div className="text-xs text-[#999]">{ev.author.major}</div>}
            </div>
          </div>
        )}

        {/* Body */}
        {ev.description && (
          <div>
            <h2 className="font-serif text-xl text-[#0a0a0a] dark:text-[#f0f0f0] mb-4">About this event</h2>
            {ev.description.split('\n\n').map((para, i) => (
              para.trim() ? <p key={i} className="text-[#2a2a2a] dark:text-[#d0d0d0] leading-relaxed text-base mb-5">{para}</p> : null
            ))}
          </div>
        )}

        {/* Tags */}
        {ev.tags && ev.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-[#e8e8e8] dark:border-[#252525]">
            <Tag size={13} className="text-[#999]" />
            {ev.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#555] dark:text-[#a0a0a0] border border-[#e8e8e8] dark:border-[#2a2a2a]">{tag}</span>
            ))}
          </div>
        )}

        {/* RSVP CTA at bottom */}
        {!isPast && (
          <div className="mt-10 p-6 rounded-2xl text-center border border-[#e8e8e8] dark:border-[#252525] bg-[#fafafa] dark:bg-[#111]">
            <p className="text-sm text-[#555] dark:text-[#a0a0a0] mb-4">{rsvpd ? "You're attending this event!" : "Will you be there?"}</p>
            <button onClick={onToggle} disabled={toggling} className={rsvpd ? 'btn-ghost' : 'btn-primary'}>
              {toggling ? '...' : rsvpd ? 'Cancel RSVP' : 'RSVP to This Event'}
            </button>
          </div>
        )}
      </article>
    </div>
  )
}

// ─── Event Card (list view) ──────────────────────────────────────────────────
function EventCard({ ev, rsvpd, toggling, onClick, onToggle }: {
  ev: Event; rsvpd: boolean; toggling: boolean
  onClick: () => void; onToggle: (e: React.MouseEvent) => void
}) {
  const eventDate = new Date(ev.event_date)
  const isPast = eventDate < new Date()

  return (
    <div className="group card overflow-hidden p-0 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={onClick}>
      {ev.image_url ? (
        <div className="w-full h-44 overflow-hidden">
          <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-full h-2 bg-gradient-to-r from-[#C0121F] to-[#7a0b12]" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <DateBlock date={ev.event_date} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#C0121F]">
              {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-[#999]">{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          {!isPast && (
            <button
              onClick={onToggle}
              disabled={toggling}
              className={`shrink-0 text-xs py-1.5 px-3 ${rsvpd ? 'btn-ghost' : 'btn-primary'}`}
            >
              {toggling ? '...' : rsvpd ? 'Going ✓' : 'RSVP'}
            </button>
          )}
        </div>
        <h3 className="font-serif text-lg text-[#0a0a0a] dark:text-[#f0f0f0] leading-snug mb-2 group-hover:text-[#C0121F] transition-colors line-clamp-2">{ev.title}</h3>
        {ev.description && <p className="text-sm text-[#555] dark:text-[#a0a0a0] line-clamp-2 leading-relaxed mb-3">{ev.description}</p>}
        {ev.tags && ev.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ev.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090]">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 pt-3 border-t border-[#f0f0f0] dark:border-[#252525] text-xs text-[#999]">
          <span className="flex items-center gap-1"><MapPin size={10} /> {ev.location}</span>
          {ev.rsvp_count !== undefined && <span className="flex items-center gap-1"><Users size={10} /> {ev.rsvp_count} going</span>}
          <div className="ml-auto flex items-center gap-1.5">
            {ev.club?.logo_url
              ? <img src={ev.club.logo_url} alt={ev.club.name} className="h-4 w-4 rounded object-cover" />
              : <span className="h-4 w-4 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: '#C0121F' }}>C</span>
            }
            <span className="hidden sm:block truncate max-w-[80px]">{ev.club?.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [rsvps, setRsvps] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Event | null>(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    const load = async () => {
      try {
        const [evRes, rsvpRes] = await Promise.all([
          supabase.from('events_with_rsvp_count')
            .select('*, club:clubs(name, logo_url), author:users(id,full_name,major,avatar_url)')
            .gte('event_date', new Date().toISOString())
            .order('event_date'),
          supabase.from('event_rsvps').select('event_id').eq('user_id', profile.id),
        ])
        if (cancelled) return
        if (evRes.error) toast('Failed to load events', 'error')
        else setEvents((evRes.data as Event[]) || [])
        setRsvps(new Set(rsvpRes.data?.map(r => r.event_id) || []))
      } catch { if (!cancelled) toast('Failed to load events', 'error') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRsvp = async (eventId: string) => {
    if (!profile || toggling.has(eventId)) return
    setToggling(t => new Set([...t, eventId]))
    if (rsvps.has(eventId)) {
      const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', profile.id)
      if (error) toast('Failed to cancel RSVP', 'error')
      else {
        setRsvps(r => { const n = new Set(r); n.delete(eventId); return n })
        setEvents(evs => evs.map(e => e.id === eventId ? { ...e, rsvp_count: (e.rsvp_count ?? 1) - 1 } : e))
        toast('RSVP removed', 'info')
      }
    } else {
      const { error } = await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: profile.id })
      if (error) toast('Failed to RSVP', 'error')
      else {
        setRsvps(r => new Set([...r, eventId]))
        setEvents(evs => evs.map(e => e.id === eventId ? { ...e, rsvp_count: (e.rsvp_count ?? 0) + 1 } : e))
        toast('RSVP confirmed!', 'success')
      }
    }
    setToggling(t => { const n = new Set(t); n.delete(eventId); return n })
  }

  const displayed = tab === 'mine' ? events.filter(e => rsvps.has(e.id)) : events

  if (selected) {
    return (
      <div className="page-container">
        <EventDetail
          ev={selected}
          rsvpd={rsvps.has(selected.id)}
          toggling={toggling.has(selected.id)}
          onToggle={() => toggleRsvp(selected.id)}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="page-container fade-up">
      <PageHeader title="Events" subtitle="Upcoming events from E-JUST clubs" />
      <div className="flex gap-2 mb-8">
        {(['all', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-full border font-medium transition-colors
              ${tab === t ? 'bg-[#C0121F] text-white border-[#C0121F]' : 'border-[#e8e8e8] text-[#555] dark:border-[#2a2a2a] dark:text-[#a0a0a0]'}`}>
            {t === 'all' ? 'All Events' : 'My Events'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState title="No events found"
          description={tab === 'mine' ? "You haven't RSVP'd to any events yet" : "No upcoming events"} />
      ) : (
        <>
          {/* Featured first event */}
          {displayed.length > 0 && (() => {
            const ev = displayed[0]
            const eventDate = new Date(ev.event_date)
            return (
              <div className="group card overflow-hidden p-0 cursor-pointer hover:shadow-xl transition-all duration-200 mb-8"
                onClick={() => setSelected(ev)}>
                <div className="md:flex">
                  {ev.image_url ? (
                    <div className="md:w-1/2 h-56 md:h-auto overflow-hidden">
                      <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="md:w-1/2 h-48 md:h-auto bg-gradient-to-br from-[#C0121F] to-[#7a0b12] flex items-center justify-center">
                      <Calendar size={48} className="text-white/30" />
                    </div>
                  )}
                  <div className="md:w-1/2 p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <DateBlock date={ev.event_date} />
                        <div>
                          <div className="text-xs font-bold text-[#C0121F] uppercase tracking-widest">Next Up</div>
                          <div className="text-sm font-semibold dark:text-[#f0f0f0]">
                            {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <h2 className="font-serif text-2xl md:text-3xl text-[#0a0a0a] dark:text-[#f0f0f0] leading-snug mb-3 group-hover:text-[#C0121F] transition-colors">{ev.title}</h2>
                      {ev.description && <p className="text-sm text-[#555] dark:text-[#a0a0a0] line-clamp-3 leading-relaxed mb-4">{ev.description}</p>}
                      {ev.tags && ev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {ev.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f4f4f4] dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-[#909090]">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#f0f0f0] dark:border-[#252525]">
                      <span className="flex items-center gap-1 text-xs text-[#999]"><MapPin size={11} /> {ev.location}</span>
                      {ev.rsvp_count !== undefined && <span className="flex items-center gap-1 text-xs text-[#999]"><Users size={11} /> {ev.rsvp_count} going</span>}
                      <button
                        onClick={e => { e.stopPropagation(); toggleRsvp(ev.id) }}
                        disabled={toggling.has(ev.id)}
                        className={`ml-auto text-xs py-1.5 px-3 ${rsvps.has(ev.id) ? 'btn-ghost' : 'btn-primary'}`}
                      >
                        {toggling.has(ev.id) ? '...' : rsvps.has(ev.id) ? 'Going ✓' : 'RSVP'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Grid */}
          {displayed.length > 1 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayed.slice(1).map(ev => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  rsvpd={rsvps.has(ev.id)}
                  toggling={toggling.has(ev.id)}
                  onClick={() => setSelected(ev)}
                  onToggle={e => { e.stopPropagation(); toggleRsvp(ev.id) }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
