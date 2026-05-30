"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

type SellerProfile = {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
};

type PrefetchedProfile = {
  full_name: string;
  username?: string;
  avatar_url?: string;
};

type Props = {
  sellerId: string | null;
  prefetchedProfile?: PrefetchedProfile | null;
  onClose: () => void;
};

const AVATAR_COLORS = ["#3d1a2e", "#1a2e3d", "#1a3d2e", "#2e1a3d", "#3d2e1a", "#2e2a1a"];
const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function SellerSheet({ sellerId, prefetchedProfile, onClose }: Props) {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // fetch seller profile + counts
  useEffect(() => {
    if (!sellerId || sellerId === 'undefined') return;
    setLoading(true);
    setFollowing(false);
    setListingCount(0);
    setSalesCount(0);

    // If we already have profile data from the feed, use it immediately
    // then try to fetch full profile (bio, location) in background
    if (prefetchedProfile) {
      setSeller({
        id: sellerId,
        full_name: prefetchedProfile.full_name,
        username: prefetchedProfile.username,
        avatar_url: prefetchedProfile.avatar_url ?? undefined,
      });
      setLoading(false);
    }

    // Try to get full profile with bio/location — silently upgrade if it works
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, bio, location")
      .eq("id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSeller(data);
        else if (!prefetchedProfile) setLoading(false);
      }, () => {
        // RLS blocked or error — prefetchedProfile already set above, just stop loading
        if (!prefetchedProfile) setLoading(false);
      });

    // fetch listing count — graceful
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "available")
      .then(({ count }) => setListingCount(count ?? 0), () => {});

    // fetch sales count — graceful
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .then(({ count }) => setSalesCount(count ?? 0), () => {});
  }, [sellerId]);

  // check follow status — wrapped in try/catch so missing table doesn't crash
  useEffect(() => {
    if (!sellerId || !currentUserId) return;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", sellerId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data), () => {}); // second arg = error handler, works on PromiseLike
  }, [sellerId, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || !sellerId || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", sellerId);
        setFollowing(false);
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: sellerId });
        setFollowing(true);
      }
    } catch {
      // follows table doesn't exist yet — just toggle UI
      setFollowing((prev) => !prev);
    }
    setFollowLoading(false);
  };

  const isOpen = !!sellerId;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />

          {/* sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] bg-[#1A060B] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-5 text-white/40 hover:text-white/80 transition text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            {loading ? (
              /* skeleton */
              <div className="px-6 py-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/08 animate-pulse" />
                <div className="w-32 h-3 rounded-full bg-white/08 animate-pulse" />
                <div className="w-20 h-2 rounded-full bg-white/05 animate-pulse" />
              </div>
            ) : seller ? (
              <div className="px-6 pt-3 pb-6">

                {/* header */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-white/15"
                    style={{ background: getAvatarColor(seller.id) }}
                  >
                    {seller.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-medium text-[#F6F3EF]" style={{ fontFamily: "var(--font-dm)" }}>
                        {getInitials(seller.full_name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[#F6F3EF] text-lg leading-tight" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
                      {seller.full_name}
                    </p>
                    {seller.username && (
                      <p className="text-[11px] text-white/40 mt-0.5" style={{ fontFamily: "var(--font-dm)" }}>
                        @{seller.username}
                      </p>
                    )}
                    {seller.location && (
                      <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1" style={{ fontFamily: "var(--font-dm)" }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {seller.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-3 gap-0 mb-5 border border-white/08 rounded-2xl overflow-hidden">
                  {[
                    { num: listingCount, label: "Listings" },
                    { num: salesCount,   label: "Sold" },
                    { num: "—",          label: "Followers" },
                  ].map((stat, i) => (
                    <div key={stat.label} className={`flex flex-col items-center py-3 ${i < 2 ? "border-r border-white/08" : ""}`}>
                      <span className="text-[#F6F3EF] text-lg" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
                        {stat.num}
                      </span>
                      <span className="text-[10px] text-white/35 uppercase tracking-[0.15em] mt-0.5" style={{ fontFamily: "var(--font-dm)" }}>
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* bio */}
                {seller.bio && (
                  <p className="text-[13px] text-white/55 leading-relaxed mb-5" style={{ fontFamily: "var(--font-dm)" }}>
                    {seller.bio}
                  </p>
                )}

                {/* actions */}
                <div className="flex gap-3">
                  {/* Follow — only show if logged in and not own profile */}
                  {currentUserId && currentUserId !== seller.id && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className="flex-1 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium transition-all disabled:opacity-50"
                      style={{
                        fontFamily: "var(--font-dm)",
                        background: following ? "transparent" : "#B48A5A",
                        color: following ? "rgba(246,243,239,0.5)" : "#0a0806",
                        border: following ? "1px solid rgba(255,255,255,0.12)" : "none",
                      }}
                    >
                      {followLoading ? "..." : following ? "Following ✓" : "Follow"}
                    </button>
                  )}

                  {!currentUserId && (
                    <Link href="/login" className="flex-1">
                      <button
                        className="w-full py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium bg-[#B48A5A] text-[#0a0806]"
                        style={{ fontFamily: "var(--font-dm)" }}
                      >
                        Login to Follow
                      </button>
                    </Link>
                  )}

                  <Link href={`/messages?seller=${seller.id}`}>
                    <button
                      className="px-5 py-3 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.18em] text-[#B48A5A] hover:border-[#B48A5A]/40 transition-colors whitespace-nowrap"
                      style={{ fontFamily: "var(--font-dm)" }}
                    >
                      Message
                    </button>
                  </Link>

                  <Link href={`/account/${seller.id}`}>
                    <button
                      className="px-5 py-3 rounded-full border border-white/12 text-[11px] uppercase tracking-[0.18em] text-white/40 hover:text-white/70 hover:border-white/25 transition-all whitespace-nowrap"
                      style={{ fontFamily: "var(--font-dm)" }}
                      onClick={onClose}
                    >
                      View →
                    </button>
                  </Link>
                </div>

              </div>
            ) : (
              <div className="px-6 py-8 text-center text-white/30 text-sm" style={{ fontFamily: "var(--font-dm)" }}>
                Could not load seller profile.
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}