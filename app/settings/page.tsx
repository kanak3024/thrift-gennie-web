"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser]         = useState<any>(null);
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Bank
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName]         = useState("");
  const [bankAccount, setBankAccount]   = useState("");
  const [bankIfsc, setBankIfsc]         = useState("");
  const [bankUpi, setBankUpi]           = useState("");
  const [savingBank, setSavingBank]     = useState(false);

  // Address
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLine, setAddrLine]               = useState("");
  const [addrCity, setAddrCity]               = useState("");
  const [addrState, setAddrState]             = useState("");
  const [addrPincode, setAddrPincode]         = useState("");
  const [addrPhone, setAddrPhone]             = useState("");
  const [savingAddress, setSavingAddress]     = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/login"); return; }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
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
      setLoading(false);
    };
    load();
  }, [router]);

  /* ── BANK ── */
  const handleSaveBankDetails = async () => {
    if (!user) return;
    setSavingBank(true);
    const { error } = await supabase.from("profiles").update({
      bank_account_name: bankName,
      bank_account_number: bankAccount,
      bank_ifsc: bankIfsc,
      bank_upi: bankUpi,
    }).eq("id", user.id);
    if (!error) {
      setProfile({ ...profile, bank_account_name: bankName, bank_account_number: bankAccount, bank_ifsc: bankIfsc, bank_upi: bankUpi });
      setShowBankForm(false);
      showToast("Payout details saved ✦");
    } else showToast("Save failed", "error");
    setSavingBank(false);
  };

  /* ── ADDRESS ── */
  const handleSaveAddress = async () => {
    if (!user) return;
    if (!addrLine.trim() || !addrCity.trim() || !addrState || !addrPincode.trim() || !addrPhone.trim()) {
      showToast("Please fill in all address fields", "error"); return;
    }
    if (!/^\d{6}$/.test(addrPincode)) { showToast("Enter a valid 6-digit pincode", "error"); return; }
    if (!/^\d{10}$/.test(addrPhone))  { showToast("Enter a valid 10-digit phone", "error"); return; }
    setSavingAddress(true);
    const { error } = await supabase.from("profiles").update({
      address_line: addrLine, city: addrCity, state: addrState,
      pincode: addrPincode, phone: addrPhone,
    }).eq("id", user.id);
    if (!error) {
      setProfile({ ...profile, address_line: addrLine, city: addrCity, state: addrState, pincode: addrPincode, phone: addrPhone });
      setShowAddressForm(false);
      showToast("Return address saved ✦");
    } else showToast("Save failed", "error");
    setSavingAddress(false);
  };

  const hasReturnAddress = profile?.address_line && profile?.city && profile?.state && profile?.pincode;

  if (loading) return (
    <main className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="text-sm opacity-30 uppercase tracking-widest">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-24">

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Link href={`/account/${user?.id}`}>
            <button className="text-[9px] uppercase tracking-[0.3em] opacity-35 hover:opacity-70 transition-opacity mb-6 flex items-center gap-2">
              ← Back to Profile
            </button>
          </Link>
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">Account</p>
          <h1 className="leading-none" style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,5vw,3rem)" }}>
            Settings
          </h1>
        </div>

        <div className="space-y-4">

          {/* ── VERIFICATION ── */}
          {profile?.kyc_status === "verified" ? (
            <div className="flex items-center gap-3 px-5 py-4 bg-[#6B7E60]/08 border border-[#6B7E60]/20 rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-[#6B7E60]/15 flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#6B7E60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#6B7E60] font-medium">Verified Seller</p>
                <p className="text-[9px] text-[#2B0A0F]/35 mt-0.5">Your number is confirmed. You can list items.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-4 bg-[#B48A5A]/08 border border-[#B48A5A]/20 rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-[#B48A5A]/15 flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01" stroke="#B48A5A" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="9" stroke="#B48A5A" strokeWidth="2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#B48A5A] font-medium">Verify to Start Selling</p>
                <p className="text-[9px] text-[#2B0A0F]/35 mt-0.5">Confirm your number to list items and receive payouts.</p>
              </div>
              <a href="/verify" className="text-[9px] uppercase tracking-[0.2em] bg-[#2B0A0F] text-[#F6F3EF] px-3 py-2 rounded-lg hover:opacity-80 transition-all flex-shrink-0">
                Verify →
              </a>
            </div>
          )}

          {/* ── EARNINGS SHORTCUT ── */}
          <button
            onClick={() => router.push("/seller/earnings")}
            className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-[#2B0A0F]/06 hover:border-[#2B0A0F]/15 transition-all group"
          >
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1">Earnings & Payouts</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest">View your sales analytics</p>
            </div>
            <span className="opacity-25 group-hover:opacity-60 transition-opacity">→</span>
          </button>

          {/* ── PAYOUT DETAILS ── */}
          <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1">Payout Details</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest truncate">
                  {profile?.bank_account_number
                    ? `Account ••••${profile.bank_account_number.slice(-4)}${profile.bank_upi ? ` · UPI: ${profile.bank_upi}` : ""}`
                    : "No payout details added yet"}
                </p>
              </div>
              <button
                onClick={() => setShowBankForm(!showBankForm)}
                className="flex-shrink-0 ml-3 px-4 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
              >
                {showBankForm ? "Cancel" : profile?.bank_account_number ? "Edit" : "Add"}
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
                  <div className="px-5 pb-5 pt-1 border-t border-[#2B0A0F]/06 space-y-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex items-center gap-2 pt-4">
                      <span>🔒</span> Your bank details are private and only visible to you.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[
                        { label: "Account Holder Name", value: bankName,    setter: setBankName,    placeholder: "As per bank records" },
                        { label: "Account Number",      value: bankAccount, setter: setBankAccount, placeholder: "XXXXXXXXXXXX" },
                        { label: "IFSC Code",           value: bankIfsc,    setter: (v: string) => setBankIfsc(v.toUpperCase()), placeholder: "SBIN0001234" },
                        { label: "UPI ID (optional)",   value: bankUpi,     setter: setBankUpi,    placeholder: "name@upi" },
                      ].map((field) => (
                        <div key={field.label} className="border-b border-[#2B0A0F]/08 pb-2">
                          <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">{field.label}</label>
                          <input
                            type="text" value={field.value}
                            onChange={(e) => field.setter(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-transparent text-sm outline-none placeholder:opacity-20"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveBankDetails} disabled={savingBank}
                      className="w-full py-3.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {savingBank ? "Saving..." : "Save Payout Details"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RETURN ADDRESS ── */}
          <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1">Return Address</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest truncate">
                  {hasReturnAddress
                    ? `${profile.address_line}, ${profile.city}, ${profile.state} — ${profile.pincode}`
                    : "Add your address — appears on shipping labels"}
                </p>
              </div>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="flex-shrink-0 ml-3 px-4 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-[0.18em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
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
                  <div className="px-5 pb-5 pt-1 border-t border-[#2B0A0F]/06 space-y-4">
                    <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex items-center gap-2 pt-4">
                      <span>📦</span> Shown as the return address on your printed shipping labels.
                    </p>
                    <div className="border-b border-[#2B0A0F]/08 pb-2">
                      <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">Address Line *</label>
                      <input type="text" value={addrLine} onChange={(e) => setAddrLine(e.target.value)}
                        placeholder="House no., street, area, landmark"
                        className="w-full bg-transparent text-sm outline-none placeholder:opacity-20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">City *</label>
                        <input type="text" value={addrCity} onChange={(e) => setAddrCity(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full bg-transparent text-sm outline-none placeholder:opacity-20" />
                      </div>
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">State *</label>
                        <div className="relative">
                          <select value={addrState} onChange={(e) => setAddrState(e.target.value)}
                            className="w-full bg-transparent text-sm outline-none appearance-none cursor-pointer pb-1 pr-5">
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
                        <input type="tel" inputMode="numeric" value={addrPincode}
                          onChange={(e) => setAddrPincode(e.target.value)}
                          placeholder="411048" maxLength={6}
                          className="w-full bg-transparent text-sm outline-none placeholder:opacity-20" />
                      </div>
                      <div className="border-b border-[#2B0A0F]/08 pb-2">
                        <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-1.5">Phone *</label>
                        <input type="tel" inputMode="numeric" value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="10-digit mobile" maxLength={10}
                          className="w-full bg-transparent text-sm outline-none placeholder:opacity-20" />
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

          {/* ── SIGN OUT ── */}
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            className="w-full py-3.5 rounded-2xl border border-[#A1123F]/20 text-[#A1123F] text-[10px] uppercase tracking-[0.25em] hover:bg-[#A1123F]/05 transition-all"
          >
            Sign Out
          </button>

        </div>
      </div>
    </main>
  );
}