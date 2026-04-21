'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────
type ActivityType = 'like' | 'save' | 'follow' | 'offer' | 'sale'

interface Actor {
  username: string
  avatar_url: string | null
}

interface Product {
  title: string
  image_url: string
  price: number
}

interface Activity {
  id: string
  type: ActivityType
  created_at: string
  text: string
  actor: Actor | null
  product: Product | null
  offer_amount?: number
  is_read: boolean
}

// ─── Helpers ──────────────────────────────────────────────────
function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase()
}

const TYPE_CONFIG: Record<ActivityType, { verb: string; icon: string; dotClass: string; badgeClass: string }> = {
  sale:   { verb: 'bought your',           icon: '✓', dotClass: 'bg-[#6B2D3E]', badgeClass: 'bg-[#F9F0F2] text-[#6B2D3E]' },
  save:   { verb: 'wishlisted your',       icon: '🔖', dotClass: 'bg-[#7C4A1E]', badgeClass: 'bg-[#FBF4EE] text-[#7C4A1E]' },
  follow: { verb: 'started following you', icon: '+', dotClass: 'bg-[#2D5A3E]',  badgeClass: 'bg-[#EEF5F1] text-[#2D5A3E]' },
  offer:  { verb: 'made an offer on your', icon: '₹', dotClass: 'bg-[#1A3A5C]', badgeClass: 'bg-[#EEF2F7] text-[#1A3A5C]' },
  like:   { verb: 'liked your',            icon: '♥', dotClass: 'bg-[#8B1A3A]', badgeClass: 'bg-[#FBF0F3] text-[#8B1A3A]' },
}

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'sale',   label: 'Sales' },
  { key: 'offer',  label: 'Offers' },
  { key: 'save',   label: 'Wishlists' },
  { key: 'like',   label: 'Likes' },
  { key: 'follow', label: 'Follows' },
] as const

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ actor }: { actor: Actor | null }) {
  if (!actor) return (
    <div className="w-10 h-10 rounded-full bg-[#F0E8E0] border border-[#E8DDD4] flex-shrink-0" />
  )
  return (
    <div className="w-10 h-10 rounded-full bg-[#F0E8E0] border border-[#E8DDD4] flex items-center justify-center text-xs font-bold text-[#6B4A3A] flex-shrink-0">
      {actor.avatar_url
        ? <img src={actor.avatar_url} alt={actor.username} className="w-full h-full rounded-full object-cover" />
        : getInitials(actor.username)}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-[#1A0A0A] text-[#F5F0EA] px-6 py-3 rounded-full text-sm font-medium z-50 whitespace-nowrap shadow-lg">
      {message}
    </div>
  )
}

// ─── Warm Lead Modal ──────────────────────────────────────────
function WarmLeadModal({
  activity,
  onClose,
  onSend,
}: {
  activity: Activity | null
  onClose: () => void
  onSend: (activity: Activity, discount: number) => void
}) {
  const [discount, setDiscount] = useState(10)
  if (!activity?.product || !activity.actor) return null
  const { product, actor } = activity
  const discountedPrice = Math.round(Number(product.price) * (1 - discount / 100))

  return (
    <div className="fixed inset-0 bg-[#1A0A0A]/55 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-[#FAF7F4] rounded-[18px] p-7 w-full max-w-[400px] border border-[#EEE5DC]" onClick={e => e.stopPropagation()}>
        <h2 className="font-serif text-xl font-bold text-[#1A0A0A] mb-1">Send a warm offer</h2>
        <p className="text-sm text-[#8B7A6E] mb-5">@{actor.username} wishlisted this — strike while it&apos;s warm.</p>

        <div className="flex gap-3 items-center bg-white rounded-xl p-3 border border-[#EEE5DC] mb-5">
          <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1A0A0A]">{product.title}</p>
            <p className="text-xs text-[#8B5E4A] mt-0.5">
              ₹{product.price} → <strong className="text-[#6B2D3E]">₹{discountedPrice}</strong>
            </p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[#6B5A52]">Discount</span>
            <span className="text-sm font-bold text-[#8B1A3A]">{discount}% off</span>
          </div>
          <input type="range" min="5" max="30" step="5" value={discount}
            onChange={e => setDiscount(Number(e.target.value))}
            className="w-full accent-[#8B1A3A]" />
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-[#B0A090]">5%</span>
            <span className="text-[11px] text-[#B0A090]">30%</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button onClick={() => onSend(activity, discount)}
            className="flex-1 py-3 rounded-full bg-[#1A0A0A] text-[#F5F0EA] font-semibold text-sm">
            Send ₹{discountedPrice} offer
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-full border border-[#D4C8BC] text-[#6B5A52] font-semibold text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Activity Row ─────────────────────────────────────────────
function ActivityRow({
  activity,
  onOfferAction,
  onWarmLead,
}: {
  activity: Activity
  onOfferAction: (id: string, action: 'accept' | 'decline') => void
  onWarmLead: (activity: Activity) => void
}) {
  const cfg = TYPE_CONFIG[activity.type]
  const isFollow = activity.type === 'follow'
  const isOffer  = activity.type === 'offer'
  const isSave   = activity.type === 'save'

  return (
    <div className={`flex items-start gap-3 py-3.5 border-b border-[#F0EBE4] ${!activity.is_read ? 'bg-[#FAF7F4]' : ''}`}>
      <div className="relative flex-shrink-0">
        <Avatar actor={activity.actor} />
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${cfg.dotClass} flex items-center justify-center text-white text-[9px] font-bold border-2 border-[#FAF7F4]`}>
          {cfg.icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] leading-snug">
            {activity.actor && (
              <span className="font-semibold text-[#1A0A0A]">@{activity.actor.username} </span>
            )}
            <span className="text-[#6B5A52]">{cfg.verb}</span>
            {!isFollow && activity.product && (
              <span className="font-semibold text-[#1A0A0A]"> {activity.product.title}</span>
            )}
            {isOffer && activity.offer_amount && (
              <span className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
                ₹{activity.offer_amount}
              </span>
            )}
          </p>
          <span className="text-[11px] text-[#B0A090] flex-shrink-0 mt-0.5">
            {timeAgo(activity.created_at)}
          </span>
        </div>

        {!activity.is_read && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B1A3A] mt-1" />
        )}

        {!isFollow && activity.product && (
          <div className="flex items-center gap-2.5 mt-2 p-2.5 bg-[#FAF7F4] rounded-xl border border-[#EEE5DC]">
            <img src={activity.product.image_url} alt={activity.product.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[#1A0A0A] truncate">{activity.product.title}</p>
              <p className="text-[11.5px] text-[#8B5E4A] mt-0.5">₹{activity.product.price}</p>
            </div>

            {isOffer && (
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => onOfferAction(activity.id, 'accept')}
                  className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full bg-[#1A0A0A] text-[#F5F0EA]">
                  Accept
                </button>
                <button onClick={() => onOfferAction(activity.id, 'decline')}
                  className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-[#D4C8BC] text-[#6B5A52]">
                  Decline
                </button>
              </div>
            )}

            {isSave && (
              <button onClick={() => onWarmLead(activity)}
                className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-[#8B1A3A]/25 bg-[#FBF0F3] text-[#8B1A3A] flex-shrink-0 whitespace-nowrap">
                Send offer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [warmLeadActivity, setWarmLeadActivity] = useState<Activity | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity()
    markAllRead()
  }, [])

  const fetchActivity = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(username, avatar_url),
        product:products(title, image_url, price)
      `)
      .eq('user_id', user.id)
      .not('type', 'is', null)           // only rich activity rows, not old plain text ones
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setActivities(data as Activity[])
    setLoading(false)

    // Realtime: new notifications come in live
    const channel = supabase
      .channel('notifications_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the full row with joins
          const { data: newRow } = await supabase
            .from('notifications')
            .select(`*, actor:profiles!actor_id(username, avatar_url), product:products(title, image_url, price)`)
            .eq('id', payload.new.id)
            .single()
          if (newRow) setActivities(prev => [newRow as Activity, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.rpc('mark_notifications_read', { p_user_id: user.id })
  }

  const filtered = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter)

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === 'all'
      ? activities.length
      : activities.filter(a => a.type === f.key).length
    return acc
  }, {} as Record<string, number>)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleOfferAction = async (id: string, action: 'accept' | 'decline') => {
    // Update offer status in offers table
    const activity = activities.find(a => a.id === id)
    if (activity?.product) {
      // Find the offer and update its status
      await supabase
        .from('offers')
        .update({ status: action === 'accept' ? 'accepted' : 'declined' })
        .eq('product_id', activity.product.title) // adjust if you have offer_id on notification
    }
    setActivities(prev => prev.filter(a => a.id !== id))
    showToast(action === 'accept' ? "Offer accepted! We'll notify the buyer." : 'Offer declined.')
  }

  const handleSendOffer = async (activity: Activity, discount: number) => {
    setWarmLeadActivity(null)
    const discountedPrice = Math.round(Number(activity.product!.price) * (1 - discount / 100))
    // TODO: Insert into offers table or send via your existing offer flow
    // await supabase.from('offers').insert({ ... })
    showToast(`Offer sent to @${activity.actor?.username} — ₹${discountedPrice}`)
  }

  return (
    <>
      <div className="max-w-[600px] mx-auto px-4 pb-16">

        {/* Header */}
        <div className="flex items-baseline justify-between mb-5 pb-4 border-b-2 border-[#1A0A0A]">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1A0A0A] tracking-tight">Activity</h1>
            <p className="text-xs text-[#8B7A6E] mt-0.5">{activities.length} interactions this week</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8B1A3A]">
            <span className="w-2 h-2 rounded-full bg-[#8B1A3A] animate-pulse" />
            Live
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150 flex items-center gap-1.5
                ${filter === f.key
                  ? 'bg-[#1A0A0A] text-[#F5F0EA] border-[#1A0A0A]'
                  : 'border-[#D4C8BC] text-[#6B5A52] hover:bg-[#F0EBE4]'}`}>
              {f.label}
              {counts[f.key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${filter === f.key ? 'bg-white/10 text-white/70' : 'bg-black/5 text-[#6B5A52]'}`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#EEE5DC] flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-[#EEE5DC] rounded-full w-3/4" />
                  <div className="h-3 bg-[#EEE5DC] rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3 text-[#C4B8AC]">✦</div>
            <p className="font-serif text-base text-[#6B5A52] mb-1">Nothing here yet</p>
            <p className="text-xs text-[#B0A090]">Activity will show up as people interact with your archive</p>
          </div>
        ) : (
          filtered.map(activity => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onOfferAction={handleOfferAction}
              onWarmLead={setWarmLeadActivity}
            />
          ))
        )}
      </div>

      <WarmLeadModal
        activity={warmLeadActivity}
        onClose={() => setWarmLeadActivity(null)}
        onSend={handleSendOffer}
      />

      {toast && <Toast message={toast} />}
    </>
  )
}