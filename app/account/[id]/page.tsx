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
   VERIFICATION BANNER
───────────────────────────── */
function VerificationBanner({ kycStatus }: { kycStatus: string }) {
  if (kycStatus === "verified") return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-[#6B7E60]/08 border border-[#6B7E60]/20 rounded-xl mb-4 sm:mb-6">
      <div className="w-5 h-5 rounded-full bg-[#6B7E60]/15 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#6B7E60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#6B7E60] font-medium">Verified seller</p>
        <p className="text-[9px] text-[#2B0A0F]/35 mt-0.5">Your number is confirmed. You can list items.</p>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-[#B48A5A]/08 border border-[#B48A5A]/20 rounded-xl mb-4 sm:mb-6">
      <div className="w-5 h-5 rounded-full bg-[#B48A5A]/15 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01" stroke="#B48A5A" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="#B48A5A" strokeWidth="2"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#B48A5A] font-medium">Verify to start selling</p>
        <p className="text-[9px] text-[#2B0A0F]/35 mt-0.5">Confirm your number to list items and receive payouts.</p>
      </div>
      <a
        href="/verify"
        className="text-[9px] uppercase tracking-[0.2em] bg-[#2B0A0F] text-[#F6F3EF] px-3 py-2 rounded-lg hover:opacity-80 transition-all flex-shrink-0"
      >
        Verify →
      </a>
    </div>
  );
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

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

  const formatCurrency = (num: number) => new Intl.NumberFormat("en-IN").format(num || 0);

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

        // Added kyc_status to the select
        const { data: profileData } = await supabase
          .from("profiles").select("*, kyc_status").eq("id", id).maybeSingle();

        if (profileData) {
          setUser(profileData);
          setEditName(profileData.full_name || "");
          setEditBio(profileData.bio || "");
          setEditRole(profileData.role || "Archive Curator");
          setBankName(profileData.bank_account_name || "");
          setBankAccount(profileData.bank_account_number || "");
          setBankIfsc(profileData.bank_ifsc || "");
          setBankUpi(profileData.bank_upi || "");
          setAddrLine(profileData.address_line || "");
          setAddrCity(profileData.city || "");
          setAddrState(profileData.state || "");
          setAddrPincode(profileData.pincode || "");
          setAddrPhone(profileData.phone || "");
        }

        const { data: productData } = await supabase
          .from("products").select("*").eq("seller_id", id);
        setProducts(productData || []);

        const { count: followers } = await supabase
          .from("follows").select("*", { count: "exact", head: true }).eq("following_id", id);
        setFollowerCount(followers || 0);

        const { count: following } = await supabase
          .from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id);
        setFollowingCount(following || 0);

        if (loggedInUser && loggedInUser.id !== id) {
          const { data: followData } = await supabase
            .from("follows").select("id")
            .eq("follower_id", loggedInUser.id).eq("following_id", id).maybeSingle();
          setIsFollowing(!!followData);
        }

        const { data: sold } = await supabase
          .from("orders").select("*, products(title, image_url, price)")
          .eq("seller_id", id).eq("status", "paid");
        setSoldItems(sold || []);

        const { data: purchased } = await supabase
          .from("orders").select("*, products(title, image_url, price)")
          .eq("buyer_id", id).eq("status", "paid");
        setPurchasedItems(purchased || []);

        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("rating, review, created_at, reviewer_id")
          .eq("seller_id", id)
          .order("created_at", { ascending: false });
        const ratings = ratingsData || [];
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length : 0;
        setSellerRatings(ratings);
        setAverageRating(avgRating);

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
    const { error } = await supabase.from("profiles").update({
      bank_account_name: bankName, bank_account_number: bankAccount,
      bank_ifsc: bankIfsc,         bank_upi: bankUpi,
    }).eq("id", currentUser.id);
    if (!error) {
      setUser({ ...user, bank_account_name: bankName, bank_account_number: bankAccount, bank_ifsc: bankIfsc, bank_upi: bankUpi });
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
                  </>
                ) : (
                  currentUser && (
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
                  )
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 py-3 sm:py-4 border-y border-[#2B0A0F]/08 mb-4 sm:mb-5">
              {[
                { value: availableProducts.length, label: "Items" },
                { value: followerCount,             label: "Followers" },
                { value: followingCount,            label: "Following" },
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
               <div className="text-center sm:text-left">
  <div className="text-lg sm:text-xl font-semibold flex items-center justify-center sm:justify-start gap-1" style={{ fontFamily: "var(--font-playfair)" }}>
    {sellerRatings.length === 0 ? (
      <span className="opacity-30">—</span>
    ) : (
      <>{averageRating.toFixed(1)}<span className="text-[#B48A5A] text-base">★</span></>
    )}
  </div>
  <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] opacity-40 mt-0.5">
    {sellerRatings.length === 0 ? "No reviews" : `${sellerRatings.length} Reviews`}
  </div>
</div>
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
                  <p className="text-sm leading-relaxed opacity-65 italic">
                    "{user.bio || "Sustainability is the new luxury."}"
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════
            VERIFICATION BANNER (owner only)
        ══════════════════════════════ */}
        {isOwner && (
          <VerificationBanner kycStatus={user.kyc_status || ""} />
        )}

        {/* ══════════════════════════════
            PAYOUT DETAILS (owner only)
        ══════════════════════════════ */}
        {isOwner && (
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white rounded-2xl border border-[#2B0A0F]/06">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1">Payout Details</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest truncate">
                  {user.bank_account_number
                    ? `Account ••••${user.bank_account_number.slice(-4)}${user.bank_upi ? ` · UPI: ${user.bank_upi}` : ""}`
                    : "No payout details added yet"}
                </p>
              </div>
              <button
                onClick={() => setShowBankForm(!showBankForm)}
                className="flex-shrink-0 px-3 sm:px-4 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
              >
                {showBankForm ? "Cancel" : user.bank_account_number ? "Edit" : "Add"}
              </button>
            </div>

            <AnimatePresence>
              {showBankForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 mt-5 border-t border-[#2B0A0F]/06 space-y-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                      <span>🔒</span> Your bank details are private and only visible to you.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {[
                        { label: "Account Holder Name", value: bankName,    setter: setBankName,    placeholder: "As per bank records" },
                        { label: "Account Number",      value: bankAccount, setter: setBankAccount, placeholder: "XXXXXXXXXXXX" },
                        { label: "IFSC Code",           value: bankIfsc,    setter: (v: string) => setBankIfsc(v.toUpperCase()), placeholder: "SBIN0001234" },
                        { label: "UPI ID (optional)",   value: bankUpi,     setter: setBankUpi,    placeholder: "name@upi" },
                      ].map((field) => (
                        <div key={field.label} className="border-b border-[#2B0A0F]/08 pb-2">
                          <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => field.setter(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:opacity-20"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveBankDetails}
                      disabled={savingBank}
                      className="w-full py-3.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {savingBank ? "Saving..." : "Save Payout Details"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ══════════════════════════════
            RETURN ADDRESS (owner only)
        ══════════════════════════════ */}
        {isOwner && (
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white rounded-2xl border border-[#2B0A0F]/06">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1">Return Address</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest truncate">
                  {hasReturnAddress
                    ? `${user.address_line}, ${user.city}, ${user.state} — ${user.pincode}`
                    : "Add your address — appears on shipping labels"}
                </p>
              </div>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="flex-shrink-0 px-3 sm:px-4 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
              >
                {showAddressForm ? "Cancel" : hasReturnAddress ? "Edit" : "Add"}
              </button>
            </div>

            <AnimatePresence>
              {showAddressForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 mt-5 border-t border-[#2B0A0F]/06 space-y-4 sm:space-y-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                      <span>📦</span> Shown as the return address on your printed shipping labels.
                    </p>
                    <div className="border-b border-[#2B0A0F]/08 pb-2">
                      <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">Address Line *</label>
                      <input
                        type="text" value={addrLine} onChange={(e) => setAddrLine(e.target.value)}
                        placeholder="House no., street, area, landmark"
                        className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:opacity-20"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">City *</label>
                        <input
                          type="text" value={addrCity} onChange={(e) => setAddrCity(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:opacity-20"
                        />
                      </div>
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">State *</label>
                        <div className="relative">
                          <select
                            value={addrState} onChange={(e) => setAddrState(e.target.value)}
                            className="w-full bg-transparent text-base sm:text-sm outline-none appearance-none cursor-pointer pb-1 pr-5"
                          >
                            <option value="">Select...</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <svg className="absolute right-0 bottom-2 pointer-events-none opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">Pincode *</label>
                        <input
                          type="tel" inputMode="numeric" value={addrPincode}
                          onChange={(e) => setAddrPincode(e.target.value)}
                          placeholder="411048" maxLength={6}
                          className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:opacity-20"
                        />
                      </div>
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">Phone *</label>
                        <input
                          type="tel" inputMode="numeric" value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="10-digit mobile" maxLength={10}
                          className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:opacity-20"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveAddress} disabled={savingAddress}
                      className="w-full py-3.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {savingAddress ? "Saving..." : "Save Return Address"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ══════════════════════════════
            EARNINGS CARD (owner only)
        ══════════════════════════════ */}
        {isOwner && (
          <div
            onClick={() => router.push("/seller/earnings")}
            className="mb-6 sm:mb-10 p-5 sm:p-6 rounded-2xl cursor-pointer bg-gradient-to-br from-[#2B0A0F] to-[#4a1a22] text-white hover:scale-[1.01] sm:hover:scale-[1.02] transition-all duration-300 shadow-md"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">Earnings</p>
            <div className="flex justify-between items-end mt-3 sm:mt-4">
              <div>
                <p className="text-xl sm:text-2xl font-semibold">₹{formatCurrency(animatedTotal)}</p>
                <p className="text-xs opacity-70 mt-1">₹{formatCurrency(animatedPending)} pending</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">Received</p>
                <p className="text-sm font-medium">₹{formatCurrency(animatedReleased)}</p>
              </div>
            </div>
            {miniChartData.length > 0 && (
              <div className="h-12 sm:h-16 mt-3 sm:mt-4 opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={miniChartData}>
                    <Line type="monotone" dataKey="earnings" stroke="#B48A5A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-xs opacity-60 mt-2 sm:mt-3">Tap to view detailed analytics →</p>
          </div>
        )}
        {sellerRatings.length > 0 && (
  <div className="mb-6 sm:mb-10">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] font-semibold">Reviews</p>
        <p className="text-[9px] opacity-35 tracking-wide mt-0.5">
          {averageRating.toFixed(1)} · {sellerRatings.length} {sellerRatings.length === 1 ? "review" : "reviews"}
        </p>
      </div>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <span key={s} className={`text-lg ${s <= Math.round(averageRating) ? "text-[#B48A5A]" : "opacity-15"}`}>★</span>
        ))}
      </div>
    </div>
    <div className="space-y-3">
      {sellerRatings.slice(0, 3).map((r: any, i: number) => (
        <div key={i} className="p-4 bg-white rounded-2xl border border-[#2B0A0F]/06">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={`text-xs ${s <= r.rating ? "text-[#B48A5A]" : "opacity-15"}`}>★</span>
              ))}
            </div>
            <span className="text-[8px] uppercase tracking-[0.2em] opacity-30">
              {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          {r.review && (
            <p className="text-sm leading-relaxed opacity-65 italic">"{r.review}"</p>
          )}
        </div>
      ))}
    </div>
    {sellerRatings.length > 3 && (
      <button className="mt-3 w-full py-3 rounded-full border border-[#2B0A0F]/12 text-[9px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity">
        See all {sellerRatings.length} reviews
      </button>
    )}
  </div>
)}

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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-5">
                  {products.map((product) => (
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
                          ₹{order.amount?.toLocaleString("en-IN")}
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
                              ₹{order.amount?.toLocaleString("en-IN")}
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
    </main>
  );
}