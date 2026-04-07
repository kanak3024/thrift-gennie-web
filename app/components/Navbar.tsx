"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { wishlist } = useWishlist();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  /* -----------------------
      FETCH PROFILE NAME
  ----------------------- */
  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    setUserName(profile?.full_name ?? null);
  };

  /* -----------------------
      GET USER + LISTEN FOR CHANGES
  ----------------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setUserName(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* -----------------------
      LOGOUT
  ----------------------- */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 w-full z-50 
      bg-[#1A060B]/95 backdrop-blur-md 
      border-b border-white/10 text-[#F6F3EF]"
    >
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">

        {/* 🔥 BRAND (GLOWING GOLD) */}
        <Link
          href="/"
          className="uppercase tracking-[0.35em] text-xs font-semibold 
          text-[#B48A5A] 
          drop-shadow-[0_0_6px_rgba(180,138,90,0.6)]
          hover:text-[#d6a96c] transition"
        >
          THRIFT GENNIE
        </Link>

        {/* NAV */}
        <div className="flex items-center gap-10 text-xs uppercase tracking-[0.25em]">

          {/* NAV LINKS */}
          <Link href="/buy" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
            <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
              Archive
            </span>
          </Link>

          <Link href="/sell" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
            <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
              Submit
            </span>
          </Link>

          <Link href="/messages" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
            <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
              Messages
            </span>
          </Link>

          {/* RESERVED */}
          <div className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
            <Link href="/wishlist">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                Reserved
              </span>
            </Link>

            {wishlist.length > 0 && (
              <span className="absolute -top-2 -right-4 text-[10px] bg-[#B48A5A] text-black px-2 rounded-full font-bold shadow-md shadow-[#B48A5A]/30">
                {wishlist.length}
              </span>
            )}
          </div>

          {/* ACCOUNT */}
          {user && (
            <Link href={`/account/${user.id}`} className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                Account
              </span>
            </Link>
          )}

          {/* LOGIN / USER */}
          {!user ? (
            <Link href="/login" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                Login
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-6 ml-6 border-l border-white/10 pl-6">

              <span className="text-[10px] opacity-50 tracking-normal capitalize">
                {userName ?? user.email}
              </span>

              <button
                onClick={handleLogout}
                className="border border-white/30 px-4 py-1 rounded-full 
                hover:bg-white hover:text-black 
                transition-all duration-300"
              >
                Logout
              </button>

            </div>
          )}

        </div>
      </div>
    </motion.header>
  );
}