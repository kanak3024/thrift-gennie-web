"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export interface ShippingAddress {
  fullName:    string;
  phone:       string;
  addressLine: string;
  city:        string;
  state:       string;
  pincode:     string;
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  onConfirm: (address: ShippingAddress) => void;
  loading:   boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const EMPTY: ShippingAddress = {
  fullName: "", phone: "", addressLine: "", city: "", state: "", pincode: "",
};

// ── Field defined OUTSIDE the modal component so it's never recreated on re-render
// ── This fixes the "one character at a time" bug caused by React remounting inputs
function Field({
  label, placeholder, type = "text", required = true,
  value, onChange, error,
}: {
  label:        string;
  placeholder?: string;
  type?:        string;
  required?:    boolean;
  value:        string;
  onChange:     (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?:       string;
}) {
  return (
    <div className="border-b border-[#2B0A0F]/10 focus-within:border-[#2B0A0F]/50 transition-colors pb-1">
      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-1.5">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent pb-2 outline-none text-sm placeholder:opacity-20"
      />
      {error && <p className="text-[9px] text-[#A1123F] mt-1">{error}</p>}
    </div>
  );
}

export default function ShippingAddressModal({ open, onClose, onConfirm, loading }: Props) {
  const [addr, setAddr]     = useState<ShippingAddress>(EMPTY);
  const [errors, setErrors] = useState<Partial<ShippingAddress>>({});

  const set = (field: keyof ShippingAddress) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setAddr(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Partial<ShippingAddress> = {};
    if (!addr.fullName.trim())         errs.fullName    = "Required";
    if (!/^\d{10}$/.test(addr.phone))  errs.phone       = "Enter a valid 10-digit number";
    if (!addr.addressLine.trim())      errs.addressLine = "Required";
    if (!addr.city.trim())             errs.city        = "Required";
    if (!addr.state)                   errs.state       = "Required";
    if (!/^\d{6}$/.test(addr.pincode)) errs.pincode     = "Enter a valid 6-digit pincode";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) onConfirm(addr);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       bg-[#F6F3EF] rounded-2xl p-8 w-[420px] max-w-[95vw] shadow-2xl
                       max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="mb-7">
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                Shipping Address
              </h3>
              <p className="text-[9px] uppercase tracking-[0.25em] opacity-40">
                Where should we send your order?
              </p>
            </div>

            <div className="space-y-5">
              <Field
                label="Full Name"
                placeholder="As on ID"
                value={addr.fullName}
                onChange={set("fullName")}
                error={errors.fullName}
              />
              <Field
                label="Phone Number"
                placeholder="10-digit mobile"
                type="tel"
                value={addr.phone}
                onChange={set("phone")}
                error={errors.phone}
              />
              <Field
                label="Address Line"
                placeholder="House no., street, area, landmark"
                value={addr.addressLine}
                onChange={set("addressLine")}
                error={errors.addressLine}
              />

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="City"
                  placeholder="Mumbai"
                  value={addr.city}
                  onChange={set("city")}
                  error={errors.city}
                />

                {/* State dropdown — kept inline since it's a select not an input */}
                <div className="border-b border-[#2B0A0F]/10 focus-within:border-[#2B0A0F]/50 transition-colors pb-1">
                  <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-1.5">
                    State *
                  </label>
                  <select
                    value={addr.state}
                    onChange={set("state")}
                    className="w-full bg-transparent pb-2 outline-none text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select...</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && (
                    <p className="text-[9px] text-[#A1123F] mt-1">{errors.state}</p>
                  )}
                </div>
              </div>

              <Field
                label="Pincode"
                placeholder="6-digit pincode"
                type="tel"
                value={addr.pincode}
                onChange={set("pincode")}
                error={errors.pincode}
              />
            </div>

            {/* Trust note */}
            <p className="text-[9px] opacity-30 mt-5 leading-relaxed">
              🔒 Your address is only shared with the seller for shipping purposes.
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:opacity-60 transition-opacity"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3.5 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[10px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    Opening...
                  </>
                ) : "Proceed to Pay →"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}