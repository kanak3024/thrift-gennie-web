'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface Activity {
  id: string
  type: string
  created_at: string
  text: string
  actor: { username: string; avatar_url: string | null } | null
  product: { title: string; image_url: string; price: number } | null
  offer_id?: string
  offer_amount?: number
  is_read: boolean
}

interface ActivityContextValue {
  activities: Activity[]
  realtimeStatus: string | null
  loading: boolean
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const start = async (userId: string) => {
      if (started.current || !isMounted) return
      started.current = true

      const { data } = await supabase
        .from('notifications')
        .select(`*, actor:profiles!actor_id(username, avatar_url), product:products(title, image_url, price)`)
        .eq('user_id', userId)
        .not('type', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!isMounted) return
      if (data) setActivities(data as Activity[])
      setLoading(false)

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          async (payload) => {
            if (!isMounted) return
            const { data: a } = await supabase
              .from('notifications')
              .select(`*, actor:profiles!actor_id(username, avatar_url), product:products(title, image_url, price)`)
              .eq('id', payload.new.id)
              .single()
            if (!isMounted || !a) return
            setActivities(prev => prev.some(x => x.id === a.id) ? prev : [a as Activity, ...prev])
          }
        )
        .subscribe((status: string) => {
          if (isMounted) setRealtimeStatus(status)
        })
      supabase.rpc('mark_notifications_read', { p_user_id: userId }).then(({ error }) => {
  if (error) console.error(error)
})

     }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) start(user.id)
      else if (isMounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) start(session.user.id)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel).catch(console.error)
    }
  }, [])

  return (
    <ActivityContext.Provider value={{ activities, realtimeStatus, loading, setActivities }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider')
  return ctx
}