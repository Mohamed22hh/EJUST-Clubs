import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { Club } from '../../types'
import { CategoryBadge } from '../ui'

interface ClubCardProps {
  club: Club
  memberStatus?: 'none' | 'pending' | 'approved'
  onApply?: () => void
}

export default function ClubCard({ club, memberStatus = 'none', onApply }: ClubCardProps) {
  return (
    <div className="group flex flex-col rounded-2xl border border-[#ebebeb] dark:border-[#252525] bg-white dark:bg-[#111111] overflow-hidden
                    transition-all duration-250 hover:border-[#d4d4d4] dark:hover:border-[#333] hover:-translate-y-1"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'default' }}>

      {/* Cover — full bleed image or color fill */}
      <div className="h-36 relative overflow-hidden">
        {club.logo_url ? (
          <>
            <img
              src={club.logo_url}
              alt={club.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* subtle dark gradient at bottom so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: '#C0121F' }}>
            <div className="absolute inset-0 bg-black/15" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <CategoryBadge category={club.category} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <Link to={`/clubs/${club.id}`}
            className="font-serif text-[1.05rem] text-[#0a0a0a] dark:text-[#f0f0f0] hover:text-[#C0121F] transition-colors line-clamp-1 leading-snug">
            {club.name}
          </Link>
          <p className="text-xs text-[#ababab] line-clamp-2 mt-1 leading-relaxed">{club.description}</p>
        </div>

        <div className="flex items-center gap-1 text-xs text-[#ababab] font-medium mt-auto">
          <Users size={11} />
          <span>{club.member_count ?? 0} members</span>
        </div>

        {/* Action */}
        <div className="pt-2 border-t border-[#f4f4f4] dark:border-[#1e1e1e]">
          {memberStatus === 'approved' ? (
            <Link to={`/clubs/${club.id}`}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-[#6b6b6b] dark:text-[#909090]
                         rounded-xl hover:bg-[#f4f4f4] dark:hover:bg-[#181818] transition-colors">
              View Club <ArrowRight size={11} />
            </Link>
          ) : memberStatus === 'pending' ? (
            <div className="flex items-center justify-center w-full py-2 text-xs font-semibold text-[#ababab] rounded-xl"
              style={{ background: '#f9f9f9', border: '1px dashed #ebebeb' }}>
              Application Pending
            </div>
          ) : (
            <button onClick={onApply}
              className="btn-primary w-full justify-center text-xs"
              style={{ padding: '0.5rem', borderRadius: '0.625rem', fontSize: '0.75rem' }}>
              Apply to Join
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
