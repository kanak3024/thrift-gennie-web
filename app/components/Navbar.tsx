"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { wishlist } = useWishlist();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    setUserName(profile?.full_name ?? null);
  };

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

  // Lock scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/login");
  };

  const navLinks = [
    { href: "/buy", label: "Archive" },
    { href: "/sell", label: "Submit" },
    { href: "/messages", label: "Messages" },
    { href: "/wishlist", label: "Reserved" },
    ...(user ? [{ href: `/account/${user.id}`, label: "Account" }] : []),
    ...(!user ? [{ href: "/login", label: "Login" }] : []),
  ];

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 w-full z-50 
        bg-[#1A060B]/95 backdrop-blur-md 
        border-b border-white/10 text-[#F6F3EF]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">

          {/* BRAND */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="uppercase tracking-[0.35em] text-xs font-semibold 
            text-[#B48A5A] 
            drop-shadow-[0_0_6px_rgba(180,138,90,0.6)]
            hover:text-[#d6a96c] transition"
          >
            THRIFT GENNIE
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.25em]">
            <Link href="/buy" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Archive</span>
            </Link>
            <Link href="/sell" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Submit</span>
            </Link>
            <Link href="/messages" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Messages</span>
            </Link>
            <div className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <Link href="/wishlist">
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Reserved</span>
              </Link>
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-4 text-[10px] bg-[#B48A5A] text-black px-2 rounded-full font-bold shadow-md shadow-[#B48A5A]/30">
                  {wishlist.length}
                </span>
              )}
            </div>
            {user && (
              <Link href={`/account/${user.id}`} className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Account</span>
              </Link>
            )}
            {!user ? (
              <Link href="/login" className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">Login</span>
              </Link>
            ) : (
              <div className="flex items-center gap-6 ml-6 border-l border-white/10 pl-6">
                <span className="text-[10px] opacity-50 tracking-normal capitalize">
                  {userName ?? user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="border border-white/30 px-4 py-1 rounded-full hover:bg-white hover:text-black transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* MOBILE RIGHT — wishlist count + hamburger */}
          <div className="flex md:hidden items-center gap-4">
            {wishlist.length > 0 && (
              <Link href="/wishlist">
                <span className="text-[10px] bg-[#B48A5A] text-black px-2 py-0.5 rounded-full font-bold">
                  {wishlist.length}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex flex-col gap-[5px] p-1"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                className="block w-5 h-[1.5px] bg-[#F6F3EF] origin-center transition-all"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="block w-5 h-[1.5px] bg-[#F6F3EF]"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                className="block w-5 h-[1.5px] bg-[#F6F3EF] origin-center transition-all"
              />
            </button>
          </div>

        </div>
      </motion.header>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[#1A060B] flex flex-col pt-24 px-8 md:hidden"
          >
            <nav className="flex flex-col gap-6 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[#F6F3EF]/70 hover:text-[#B48A5A] uppercase tracking-[0.3em] text-sm border-b border-white/08 pb-6 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {user && (
              <div className="mt-10 pt-6 border-t border-white/10">
                <p className="text-[10px] opacity-40 tracking-wide capitalize mb-4">
                  {userName ?? user.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="border border-white/30 px-6 py-2 rounded-full text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
                >
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
