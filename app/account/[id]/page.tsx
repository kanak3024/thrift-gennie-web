"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LineChart, Line, ResponsiveContainer } from "recharts";

/* ─────────────────────────────
   SKELETON
───────────────────────────── */
function AccountSkeleton() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] pt-20 sm:pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 mb-10 sm:mb-14">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-[#EAE3DB] flex-shrink-0" />
          <div className="flex-1 space-y-4 pt-2 sm:pt-4 w-full">
            <div className="h-7 w-48 bg-[#EAE3DB] rounded-full mx-auto sm:mx-0" />
            <div className="h-3 w-64 bg-[#EAE3DB] rounded-full mx-auto sm:mx-0" />
            <div className="h-3 w-40 bg-[#EAE3DB] rounded-full mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-[#EAE3DB] rounded-xl" />)}
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   TOAST
───────────────────────────── */
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] shadow-lg whitespace-nowrap ${
        type === "success" ? "bg-[#2B0A0F] text-[#F6F3EF]" : "bg-[#A1123F] text-white"
      }`}
    >
      {message}
    </motion.div>
  );
}

/* ─────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────── */
function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                   w-[calc(100vw-2rem)] sm:w-[340px] shadow-2xl"
      >
        <h3 className="text-lg mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          Delete this piece?
        </h3>
        <p className="text-sm opacity-50 mb-7 leading-relaxed">
          This will permanently remove the listing from the archive. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F]/05 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-[#A1123F] text-white text-[10px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}


/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function AccountPage() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser]                         = useState<any>(null);
  const [products, setProducts]                 = useState<any[]>([]);
  const [currentUser, setCurrentUser]           = useState<any>(null);
  const [isFollowing, setIsFollowing]           = useState(false);
  const [followerCount, setFollowerCount]       = useState(0);
  const [followingCount, setFollowingCount]     = useState(0);
  const [loading, setLoading]                   = useState(true);
  const [isEditing, setIsEditing]               = useState(false);
  const [uploadingPfp, setUploadingPfp]         = useState(false);
  const [followLoading, setFollowLoading]       = useState(false);
  const [soldItems, setSoldItems]               = useState<any[]>([]);
  const [purchasedItems, setPurchasedItems]     = useState<any[]>([]);
  const [activeTab, setActiveTab]               = useState<"collections" | "sold" | "purchased">("collections");
  const [openMenuId, setOpenMenuId]             = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId]     = useState<string | null>(null);
  const [toast, setToast]                       = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sellerRatings, setSellerRatings]       = useState<any[]>([]);
  const [earnings, setEarnings]                 = useState(0);
  const [pendingEarnings, setPendingEarnings]   = useState(0);
  const [releasedEarnings, setReleasedEarnings] = useState(0);
  const [animatedTotal, setAnimatedTotal]       = useState(0);
  const [animatedPending, setAnimatedPending]   = useState(0);
  const [animatedReleased, setAnimatedReleased] = useState(0);
  const [miniChartData, setMiniChartData]       = useState<any[]>([]);
  const [averageRating, setAverageRating]       = useState(0);

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio]   = useState("");
  const [editRole, setEditRole] = useState("");

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName]         = useState("");
  const [bankAccount, setBankAccount]   = useState("");
  const [bankIfsc, setBankIfsc]         = useState("");
  const [bankUpi, setBankUpi]           = useState("");
  const [savingBank, setSavingBank]     = useState(false);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLine, setAddrLine]               = useState("");
  const [addrCity, setAddrCity]               = useState("");
  const [addrState, setAddrState]             = useState("");
  const [addrPincode, setAddrPincode]         = useState("");
  const [addrPhone, setAddrPhone]             = useState("");
  const [savingAddress, setSavingAddress]     = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high">("newest");
const [dashboardOpen, setDashboardOpen] = useState(false);
  const formatCurrency = (num: number) => new Intl.NumberFormat("en-IN").format(num || 0);
  const formatJoinedDate = (dateStr: string) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

  const animateValue = (value: number, setter: any) => {
    let start = 0;
    const stepTime = 20;
    const increment = value / (800 / stepTime);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { setter(value); clearInterval(timer); }
      else setter(Math.floor(start));
    }, stepTime);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── LOAD DATA ── */
  useEffect(() => {
    if (!id) return;
    const loadPageData = async () => {
      setLoading(true);
       try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedInUser = session?.user ?? null;
        if (loggedInUser) setCurrentUser(loggedInUser);

        const [
          { data: profileData },
          { data: productData },
          { count: followers },
          { count: following },
          { data: sold },
          { data: purchased },
          { data: ratingsData },
          { data: payoutData },
        ] = await Promise.all([
          supabase.from("profiles").select("*, kyc_status").eq("id", id).maybeSingle(),
          supabase.from("products").select("*").eq("seller_id", id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
          supabase.from("orders").select("*, products(title, image_url, price)")
            .eq("seller_id", id).in("status", ["payment_held", "released", "delivered"]),
          supabase.from("orders").select("*, products(title, image_url, price)")
            .eq("buyer_id", id).in("status", ["paid", "payment_held", "completed", "delivered"]),
          supabase.from("ratings").select("rating, review, created_at, reviewer_id")
            .eq("seller_id", id).order("created_at", { ascending: false }),
          supabase.from("payout_details").select("*").eq("user_id", id as string).maybeSingle(),
]);

        if (profileData) {
          setUser(profileData);
          setEditName(profileData.full_name || "");
          setEditBio(profileData.bio || "");
          setEditRole(profileData.role || "Archive Curator");
           setBankName(payoutData?.bank_account_name || "");
setBankAccount(payoutData?.bank_account_number || "");
setBankIfsc(payoutData?.bank_ifsc || "");
setBankUpi(payoutData?.bank_upi || "");
          setAddrLine(profileData.address_line || "");
          setAddrCity(profileData.city || "");
          setAddrState(profileData.state || "");
          setAddrPincode(profileData.pincode || "");
          setAddrPhone(profileData.phone || "");
        }

        setProducts(productData || []);
        setFollowerCount(followers || 0);
        setFollowingCount(following || 0);
        setSoldItems(sold || []);
        setPurchasedItems(purchased || []);

        const ratings = ratingsData || [];
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length : 0;
        setSellerRatings(ratings);
        setAverageRating(avgRating);

        if (loggedInUser && loggedInUser.id !== id) {
          const { data: followData } = await supabase
            .from("follows").select("id")
            .eq("follower_id", loggedInUser.id).eq("following_id", id).maybeSingle();
          setIsFollowing(!!followData);
        }

      } catch (err: any) {
        console.error("Error loading account:", err.message);
      } finally {
        setLoading(false);
      }
      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("seller_id", id);

      if (ordersData) {
        let total = 0, pendingAmt = 0, releasedAmt = 0;
        ordersData.forEach((order: any) => {
          const payout = order.payout_amount || 0;
          total += payout;
          if (order.payout_status === "pending")  pendingAmt  += payout;
          if (order.payout_status === "released") releasedAmt += payout;
        });
        const grouped: any = {};
        ordersData.forEach((order: any) => {
          if (order.status === "delivered") {
            const date = new Date(order.created_at).toLocaleDateString();
            if (!grouped[date]) grouped[date] = 0;
            grouped[date] += order.payout_amount || 0;
          }
        });
        setMiniChartData(Object.keys(grouped).map(date => ({ date, earnings: grouped[date] })));
        setEarnings(total);
        setPendingEarnings(pendingAmt);
        setReleasedEarnings(releasedAmt);
        animateValue(total,      setAnimatedTotal);
        animateValue(pendingAmt, setAnimatedPending);
        animateValue(releasedAmt, setAnimatedReleased);
      }
    };
    loadPageData();
  }, [id]);
  useEffect(() => {
  const handler = () => setOpenMenuId(null);
  if (openMenuId) document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}, [openMenuId]);

  /* ── FOLLOW ── */
  const handleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", currentUser.id).eq("following_id", id);
      setIsFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
    setFollowLoading(false);
  };

  /* ── AVATAR UPLOAD ── */
  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploadingPfp(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${currentUser.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", currentUser.id);
      setUser({ ...user, avatar_url: urlData.publicUrl });
      showToast("Photo updated ✦");
    } catch { showToast("Upload failed", "error"); }
    finally { setUploadingPfp(false); }
  };

  /* ── UPDATE PROFILE ── */
  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from("profiles").upsert({
      id: currentUser.id, full_name: editName, bio: editBio, role: editRole,
      updated_at: new Date(),
    });
    if (!error) {
      setUser({ ...user, full_name: editName, bio: editBio, role: editRole });
      setIsEditing(false);
      showToast("Profile updated ✦");
    } else showToast("Update failed", "error");
  };

  /* ── BANK DETAILS ── */
  const handleSaveBankDetails = async () => {
    if (!currentUser) return;
    setSavingBank(true);
     const { error } = await supabase.from("payout_details").upsert({
  id: currentUser.id,
  user_id: currentUser.id,
  bank_account_name: bankName,
  bank_account_number: bankAccount,
  bank_ifsc: bankIfsc,
  bank_upi: bankUpi,
  updated_at: new Date().toISOString(),
}, { onConflict: "user_id" });
if (!error) {
  setUser({ ...user });
      setShowBankForm(false);
      showToast("Payout details saved ✦");
    } else showToast("Save failed", "error");
    setSavingBank(false);
  };

  /* ── RETURN ADDRESS ── */
  const handleSaveAddress = async () => {
    if (!currentUser) return;
    if (!addrLine.trim() || !addrCity.trim() || !addrState || !addrPincode.trim() || !addrPhone.trim()) {
      showToast("Please fill in all address fields", "error"); return;
    }
    if (!/^\d{6}$/.test(addrPincode)) { showToast("Enter a valid 6-digit pincode", "error"); return; }
    if (!/^\d{10}$/.test(addrPhone))  { showToast("Enter a valid 10-digit phone", "error"); return; }
    setSavingAddress(true);
    const { error } = await supabase.from("profiles").update({
      address_line: addrLine, city: addrCity, state: addrState,
      pincode: addrPincode,   phone: addrPhone,
    }).eq("id", currentUser.id);
    if (!error) {
      setUser({ ...user, address_line: addrLine, city: addrCity, state: addrState, pincode: addrPincode, phone: addrPhone });
      setShowAddressForm(false);
      showToast("Return address saved ✦");
    } else showToast("Save failed", "error");
    setSavingAddress(false);
  };

  /* ── PRODUCT ACTIONS ── */
  const handleMarkSold = async (productId: string) => {
    const { error } = await supabase.from("products").update({ status: "sold" }).eq("id", productId);
    if (!error) {
      const soldProduct = products.find(p => p.id === productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (soldProduct) setSoldItems(prev => [...prev, {
        id: productId, created_at: new Date().toISOString(), amount: soldProduct.price,
        products: { title: soldProduct.title, image_url: soldProduct.image_url, price: soldProduct.price },
      }]);
      setActiveTab("sold");
      setOpenMenuId(null);
      showToast("Marked as sold ✦");
    }
  };
  const handleShareProfile = async () => {
  const url = `${window.location.origin}/account/${id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Profile link copied ✦");
  } catch {
    showToast("Couldn't copy link", "error");
  }
};

  const handleMarkUnavailable = async (productId: string) => {
    const { error } = await supabase.from("products").update({ status: "unavailable" }).eq("id", productId);
    if (!error) { setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: "unavailable" } : p)); setOpenMenuId(null); }
  };

  const handleMarkAvailable = async (productId: string) => {
    const { error } = await supabase.from("products").update({ status: "available" }).eq("id", productId);
    if (!error) { setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: "available" } : p)); setOpenMenuId(null); }
  };

  const handleDelete = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (!error) { setProducts(prev => prev.filter(p => p.id !== productId)); showToast("Piece removed from archive"); }
    else showToast("Delete failed", "error");
    setDeleteTargetId(null);
  };

  if (loading) return <AccountSkeleton />;

  if (!user) return (
    <main className="min-h-screen bg-[#F6F3EF] flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-3xl opacity-20" style={{ fontFamily: "var(--font-playfair)" }}>Curator not found.</p>
      <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">This profile hasn't been set up yet.</p>
      <Link href="/buy">
        <button className="px-6 py-3 border border-[#2B0A0F]/20 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
          Back to Archive →
        </button>
      </Link>
    </main>
  );

  const isOwner           = currentUser?.id === id;
   const hasupi = !!bankUpi;
  const displayName       = user.full_name || "Curator";
  const availableProducts = products.filter(p => p.status === "available");
  const hasReturnAddress  = user.address_line && user.city && user.state && user.pincode;

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTargetId && (
          <DeleteModal
            onConfirm={() => handleDelete(deleteTargetId)}
            onCancel={() => setDeleteTargetId(null)}
          />
        )}
      </AnimatePresence>
      {/* BANK FORM MODAL */}
<AnimatePresence>
  {showBankForm && (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={() => setShowBankForm(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                   w-[calc(100vw-2rem)] sm:w-[440px] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl" style={{ fontFamily: "var(--font-playfair)" }}>Payout Details</h3>
            <p className="text-[9px] uppercase tracking-widest opacity-40 mt-0.5">Required to receive payments</p>
          </div>
          <button
            onClick={() => setShowBankForm(false)}
            className="w-8 h-8 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center text-[11px] opacity-40 hover:opacity-100 transition-opacity"
          >✕</button>
        </div>

        <div className="space-y-5">
          {/* UPI — most important field */}
          <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
            <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">UPI ID *</label>
            <input
              type="text"
              value={bankUpi}
              onChange={(e) => setBankUpi(e.target.value)}
              placeholder="yourname@upi"
              className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
            />
          </div>

          {/* Bank name */}
          <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
            <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Account Holder Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="As on bank account"
              className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
            />
          </div>

          {/* Account number */}
          <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
            <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Account Number</label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Bank account number"
              className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
            />
          </div>

          {/* IFSC */}
          <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
            <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">IFSC Code</label>
            <input
              type="text"
              value={bankIfsc}
              onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
            />
          </div>
        </div>

        <p className="text-[9px] opacity-30 leading-relaxed mt-4 mb-6">
          Your details are stored securely and only used for payouts when your pieces sell.
        </p>

        <button
          onClick={handleSaveBankDetails}
          disabled={savingBank || !bankUpi.trim()}
          className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {savingBank ? (
            <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>Saving...</>
          ) : "Save Payout Details ✦"}
        </button>
      </motion.div>
    </>
  )}
</AnimatePresence>

      <div className="pt-20 sm:pt-32 pb-0 px-4 sm:px-6 max-w-4xl mx-auto">

        {/* ── PROFILE HEADER ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 md:gap-16 mb-8 sm:mb-12">

          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-[#2B0A0F] flex items-center justify-center text-[#F6F3EF] text-3xl sm:text-4xl font-light overflow-hidden border-4 border-white shadow-md">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt={displayName} fill className="object-cover rounded-full" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            {isOwner && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
                             opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                             transition-opacity cursor-pointer"
                >
                  <span className="text-white text-[8px] uppercase tracking-[0.2em] text-center px-2">
                    {uploadingPfp ? "Uploading..." : "Change"}
                  </span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePfpUpload} />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left w-full">

            {/* Name + action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              {isEditing ? (
                <input
                  className="bg-transparent border-b border-[#2B0A0F]/20 outline-none pb-1 w-full max-w-sm mx-auto sm:mx-0 text-center sm:text-left"
                  style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.4rem,3vw,2.2rem)" }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              ) : (
                <h1
                  className="leading-tight"
                  style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.6rem,3vw,2.5rem)" }}
                >
                  {displayName}
                </h1>
              )}

              {/* Action buttons */}

         <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap sm:ml-2">
  {isOwner ? (
    <>
      <button
        onClick={isEditing ? handleUpdateProfile : () => setIsEditing(true)}
        className={`px-4 sm:px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.18em] transition-all ${
          isEditing
            ? "bg-[#2B0A0F] text-[#F6F3EF] hover:opacity-80"
            : "border border-[#2B0A0F]/20 hover:bg-[#2B0A0F] hover:text-[#F6F3EF]"
        }`}
      >
        {isEditing ? "Save" : "Edit Profile"}
      </button>
      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 sm:px-5 py-2 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.18em] opacity-50 hover:opacity-100 transition-opacity"
        >
          Cancel
        </button>
      )}
      <Link href="/orders">
        <button className="px-4 sm:px-5 py-2 rounded-full border border-[#2B0A0F]/20 text-[10px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
          Orders
        </button>
      </Link>
      <Link href="/settings">
  <button
    className="px-3 py-2 rounded-full border border-[#2B0A0F]/20 text-[10px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
    title="Settings"
  >
    ⚙
  </button>
</Link>
      <button
        onClick={handleShareProfile}
        className="px-3 py-2 rounded-full border border-[#2B0A0F]/20 text-[10px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
        title="Share profile"
      >
        ↗
      </button>
    </>
  ) : (
     
      <div className="flex items-center gap-2">
         {currentUser && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleFollow}
          disabled={followLoading}
          className={`px-5 sm:px-6 py-2.5 rounded-full text-[10px] uppercase tracking-[0.18em] transition-all disabled:opacity-40 ${
            isFollowing
              ? "border border-[#2B0A0F]/20 hover:border-[#A1123F]/30 hover:text-[#A1123F]"
              : "bg-[#2B0A0F] text-[#F6F3EF] hover:opacity-80"
          }`}
        >
          {followLoading ? "..." : isFollowing ? "Following ✦" : "Follow"}
        </motion.button>
         )}
        <Link href={`/messages?with=${id}`}>
  <button className="px-4 py-2.5 rounded-full border border-[#2B0A0F]/20 text-[10px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
    Message
  </button>
</Link>
         
        <button
          onClick={handleShareProfile}
          className="px-3 py-2 rounded-full border border-[#2B0A0F]/20 text-[10px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
          title="Share profile"
        >
          ↗
        </button>
      </div>
    
  )}
</div>
</div>
{/* Stats row */}
 <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 py-3 sm:py-4 border-y border-[#2B0A0F]/08 mb-4 sm:mb-5 flex-wrap">
  {[
    { value: availableProducts.length, label: "Items" },
    { value: soldItems.length,         label: "Sales" },
    { value: followerCount,            label: "Followers" },
    { value: followingCount,           label: "Following" },
  ].map((stat) => (
    <div key={stat.label} className="text-center sm:text-left">
      <div className="text-lg sm:text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
        {stat.value}
      </div>
      <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-40 mt-0.5">
        {stat.label}
      </div>
    </div>
  ))}
  {user.created_at && (
    <div className="text-center sm:text-left">
      <div className="text-sm sm:text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
        {formatJoinedDate(user.created_at)}
      </div>
      <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-40 mt-0.5">Joined</div>
    </div>
  )}
  {sellerRatings.length > 0 && (
    <div className="text-center sm:text-left">
      <div className="text-lg sm:text-xl font-semibold flex items-center justify-center sm:justify-start gap-1" style={{ fontFamily: "var(--font-playfair)" }}>
        {averageRating.toFixed(1)}<span className="text-[#B48A5A] text-base">★</span>
      </div>
      <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-40 mt-0.5">
        {sellerRatings.length} {sellerRatings.length === 1 ? "Review" : "Reviews"}
      </div>
    </div>
  )}
</div>

            {/* Bio / role */}
            <div className="max-w-sm mx-auto sm:mx-0 space-y-2">
              {isEditing ? (
                <>
                  <input
                    className="w-full text-[10px] uppercase tracking-[0.25em] text-[#B48A5A] bg-transparent border-b border-[#2B0A0F]/10 outline-none pb-1 text-center sm:text-left"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Your role (e.g. Archive Curator)"
                  />
                  <textarea
                    className="w-full text-sm leading-relaxed opacity-70 bg-transparent border border-[#2B0A0F]/10 rounded-xl p-3 outline-none resize-none focus:border-[#2B0A0F]/25 transition-colors"
                    value={editBio}
                    rows={3}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write something about yourself..."
                  />
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#B48A5A]">
                    {user.role || "Archive Curator"}
                  </p>
                   {user.bio ? (
  <p className="text-sm leading-relaxed opacity-65 italic">"{user.bio}"</p>
) : isOwner ? (
  <button
    onClick={() => setIsEditing(true)}
    className="text-sm opacity-30 italic hover:opacity-60 transition-opacity"
  >
    + Add a bio to tell buyers your style...
  </button>
  
) : null}
{(user.city || user.state) && !isEditing && (
  <p className="text-[9px] uppercase tracking-[0.2em] opacity-35 mt-2">
    📍 {[user.city, user.state].filter(Boolean).join(", ")}
  </p>
)}
                </>
              )}
            </div>
          </div>
        </div>
        {/* ══════════════════════════════
            TABS
        ══════════════════════════════ */}
        <div className="flex gap-0 border-b border-[#2B0A0F]/08 overflow-x-auto">
          {([
            { key: "collections", label: "Collections", count: products.length },
            ...(isOwner ? [
              { key: "sold",      label: "Sold",      count: soldItems.length },
              { key: "purchased", label: "Purchased", count: purchasedItems.length },
            ] : [])
          ] as { key: typeof activeTab; label: string; count: number }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-shrink-0 px-4 sm:px-5 py-3 sm:py-3.5 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "text-[#2B0A0F]" : "text-[#2B0A0F]/35 hover:text-[#2B0A0F]/65"
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1.5 opacity-50">{tab.count}</span>}
              {activeTab === tab.key && (
                <motion.div layoutId="account-tab-line" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#2B0A0F]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          TAB CONTENT
      ══════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        <AnimatePresence mode="wait">
          {/* UPI Warning Banner */}
{isOwner && !hasupi && (
  <div className="mb-6 p-4 rounded-2xl border border-[#B48A5A]/30 bg-[#B48A5A]/05 flex items-center justify-between gap-4">
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#B48A5A] font-medium mb-0.5">
        ⚠️ Add UPI to receive payouts
      </p>
      <p className="text-[9px] opacity-50">
        You won't receive payment for sales until you add your UPI ID.
      </p>
    </div>
    <button
      onClick={() => setShowBankForm(true)}
      className="text-[9px] uppercase tracking-[0.15em] px-3 py-2 rounded-full border border-[#B48A5A]/40 text-[#B48A5A] hover:bg-[#B48A5A] hover:text-white transition-all flex-shrink-0"
    >
      Add Now →
    </button>
  </div>
)}

          {/* COLLECTIONS */}
          {activeTab === "collections" && (
            <motion.div key="collections" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {products.length === 0 ? (
                <div className="py-20 sm:py-24 text-center">
                  <p className="text-2xl opacity-15 mb-3" style={{ fontFamily: "var(--font-playfair)" }}>Nothing listed yet.</p>
                  <p className="text-[9px] uppercase tracking-[0.3em] opacity-25 mb-8">
                    {isOwner ? "Start building your archive." : "This curator hasn't listed anything yet."}
                  </p>
                  {isOwner && (
                    <Link href="/sell">
                      <button className="px-6 py-3 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
                        Submit a Piece →
                      </button>
                    </Link>
                  )}
                </div>
               ) : (
  <>
    <div className="flex gap-2 mb-5 flex-wrap">
      {[
        { key: "newest",     label: "Newest" },
        { key: "price_low",  label: "Price ↑" },
        { key: "price_high", label: "Price ↓" },
      ].map((s) => (
        <button key={s.key}
          onClick={() => setSortBy(s.key as any)}
          className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.15em] border transition-all ${
            sortBy === s.key
              ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
              : "border-[#2B0A0F]/15 opacity-50 hover:opacity-100"
          }`}
        >{s.label}</button>
      ))}
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-5">
      {[...products].sort((a, b) => {
        if (sortBy === "price_low")  return a.price - b.price;
        if (sortBy === "price_high") return b.price - a.price;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }).map((product) => (
                    <motion.div key={product.id} layout className="group relative">
                      <Link href={`/product/${product.id}`}>
                        <div className={`relative aspect-square bg-[#EAE3DB] overflow-hidden rounded-xl ${product.status !== "available" ? "opacity-50" : ""}`}>
                          <Image src={product.image_url || "/final.png"} alt={product.title} fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {product.status !== "available" && (
                            <div className={`absolute top-2 sm:top-3 left-2 sm:left-3 text-white text-[7px] sm:text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 sm:py-1 rounded-full ${
                              product.status === "sold" ? "bg-[#A1123F]/80" : "bg-[#2B0A0F]/70"
                            }`}>
                              {product.status}
                            </div>
                          )}
                          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
                            <p className="text-white text-[10px] sm:text-xs truncate opacity-80">{product.title}</p>
                            <p className="text-white text-xs sm:text-sm font-medium mt-0.5" style={{ fontFamily: "var(--font-playfair)" }}>
                              ₹{product.price}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {isOwner && (
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20">
                          <button
                            onClick={(e) => { e.preventDefault(); setOpenMenuId(openMenuId === product.id ? null : product.id); }}
                            className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[#2B0A0F] text-sm shadow-sm hover:bg-white transition-colors"
                          >
                            ⋮
                          </button>
                          <AnimatePresence>
                            {openMenuId === product.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-40 sm:w-44 bg-white rounded-xl border border-[#2B0A0F]/08 shadow-xl overflow-hidden text-[10px] uppercase tracking-[0.15em] z-30"
                              >
                                <button
  onClick={() => { router.push(`/sell/edit/${product.id}`); setOpenMenuId(null); }}
  className="block w-full text-left px-4 py-3 hover:bg-[#F6F3EF] transition-colors border-b border-[#2B0A0F]/05"
>
  Edit Listing
</button>
                                {product.status !== "sold" && (
                                  <button onClick={() => handleMarkSold(product.id)}
                                    className="block w-full text-left px-4 py-3 hover:bg-[#F6F3EF] transition-colors border-b border-[#2B0A0F]/05">
                                    Mark as Sold
                                  </button>
                                )}
                                {product.status !== "unavailable" && (
                                  <button onClick={() => handleMarkUnavailable(product.id)}
                                    className="block w-full text-left px-4 py-3 hover:bg-[#F6F3EF] transition-colors border-b border-[#2B0A0F]/05">
                                    Mark Unavailable
                                  </button>
                                )}
                                {product.status !== "available" && (
                                  <button onClick={() => handleMarkAvailable(product.id)}
                                    className="block w-full text-left px-4 py-3 hover:bg-[#F6F3EF] transition-colors border-b border-[#2B0A0F]/05">
                                    Mark Available
                                  </button>
                                )}
                                <button
                                  onClick={() => { setDeleteTargetId(product.id); setOpenMenuId(null); }}
                                  className="block w-full text-left px-4 py-3 text-[#A1123F] hover:bg-[#A1123F]/05 transition-colors"
                                >
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                </>
              )}
              {sellerRatings.length > 0 && (
  <div className="mt-10">
    <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-4">Reviews</p>
    <div className="space-y-3">
      {sellerRatings.map((r, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-[#2B0A0F]/06">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((star) => (
                <span key={star} className={star <= r.rating ? "text-[#B48A5A]" : "text-[#2B0A0F]/15"}>★</span>
              ))}
            </div>
            <span className="text-[9px] opacity-30">
              {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
          </div>
          {r.review && <p className="text-sm opacity-60 italic leading-relaxed">"{r.review}"</p>}
        </div>
      ))}
    </div>
  </div>
)}
            </motion.div>
            
          )}

          {/* SOLD */}
          {activeTab === "sold" && isOwner && (
            <motion.div key="sold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {soldItems.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-2xl opacity-15 mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No sales yet.</p>
                  <p className="text-[9px] uppercase tracking-[0.3em] opacity-25">Your sold pieces will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {soldItems.map((order) => (
                    <div key={order.id} className="flex items-center gap-3 sm:gap-5 p-3 sm:p-4 bg-white rounded-2xl border border-[#2B0A0F]/06">
                      <div className="relative w-12 sm:w-14 h-14 sm:h-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#EAE3DB]">
                        <Image src={order.products?.image_url || "/final.png"} alt={order.products?.title || "Product"} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{order.products?.title}</p>
                        <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-35 mt-1">
                          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                         <p className="text-sm sm:text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
  ₹{(order.payout_amount || order.products?.price)?.toLocaleString("en-IN")}
</p>
<span className="text-[8px] uppercase tracking-[0.2em] text-[#6B7E60] bg-[#6B7E60]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
  Sold
</span>
</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* PURCHASED */}
          {activeTab === "purchased" && isOwner && (
            <motion.div key="purchased" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {purchasedItems.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-2xl opacity-15 mb-2" style={{ fontFamily: "var(--font-playfair)" }}>No purchases yet.</p>
                  <p className="text-[9px] uppercase tracking-[0.3em] opacity-25">Pieces you buy will appear here.</p>
                  <Link href="/buy">
                    <button className="mt-8 px-6 py-3 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                      Browse the Archive →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchasedItems.map((order) => (
                    <Link key={order.id} href={`/product/${order.product_id}`}>
                      <div className="flex items-center gap-3 sm:gap-5 p-3 sm:p-4 bg-white rounded-2xl border border-[#2B0A0F]/06 hover:border-[#2B0A0F]/15 transition-all group">
                        <div className="relative w-12 sm:w-14 h-14 sm:h-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#EAE3DB]">
                          <Image src={order.products?.image_url || "/final.png"} alt={order.products?.title || "Product"} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{order.products?.title}</p>
                          <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-35 mt-1">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 flex items-center gap-2 sm:gap-3">
                          <div>
                            <p className="text-sm sm:text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                               ₹{(order.payout_amount || order.products?.price)?.toLocaleString("en-IN")}
                            </p>
                            <span className="text-[8px] uppercase tracking-[0.2em] text-[#B48A5A] bg-[#B48A5A]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                              Purchased
                            </span>
                          </div>
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity text-sm hidden sm:block">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      {isOwner && (
  <Link href="/sell">
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="fixed bottom-6 right-6 z-40 bg-[#2B0A0F] text-[#F6F3EF] px-5 py-3.5 rounded-full text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center gap-2"
    >
      <span className="text-base leading-none">+</span> New Piece
    </motion.button>
  </Link>
)}
    </main>
  );
}