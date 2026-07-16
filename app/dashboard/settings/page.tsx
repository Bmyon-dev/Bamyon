"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { planUnlocks } from "@/lib/permissions";
import ImageUpload from "@/components/ImageUpload";
import AiLogoGenerator from "@/components/AiLogoGenerator";
import ThemeSettings from "@/components/ThemeSettings";

export default function SettingsPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(business?.name || "");
  const [address, setAddress] = useState(business?.address || "");
  const [phone, setPhone] = useState(business?.businessPhone || "");
  const [whatsapp, setWhatsapp] = useState(business?.whatsappNumber || "");
  const [storeDescription, setStoreDescription] = useState(business?.storeDescription || "");
  const [receivingBankName, setReceivingBankName] = useState(business?.receivingBankName || "");
  const [receivingAccountNumber, setReceivingAccountNumber] = useState(business?.receivingAccountNumber || "");
  const [receivingAccountName, setReceivingAccountName] = useState(business?.receivingAccountName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isPremium = planUnlocks(business, "premium");

  async function handleSave() {
    if (!business?.id) return;
    setSaving(true);
    const toastId = toast.loading("Saving business profile…");
    try {
      await updateDoc(doc(db, "businesses", business.id), {
        name, address, businessPhone: phone, whatsappNumber: whatsapp,
        storeDescription, receivingBankName, receivingAccountNumber, receivingAccountName,
      });
      toast.success("Profile saved", toastId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  async function saveLogoUrl(url: string) {
    if (!business?.id) return;
    const toastId = toast.loading("Saving logo…");
    try {
      await updateDoc(doc(db, "businesses", business.id), { logoUrl: url });
      toast.success("Logo updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save logo", toastId);
    }
  }

  async function saveCoverUrl(url: string) {
    if (!business?.id) return;
    const toastId = toast.loading("Saving cover photo…");
    try {
      await updateDoc(doc(db, "businesses", business.id), { storeCoverUrl: url });
      toast.success("Cover photo updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save cover photo", toastId);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-black/50 mt-1">Manage your business profile.</p>

      <div className="card p-5 mt-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Business Name</label>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Business Address</label>
          <input className="input mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Business Phone</label>
          <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">WhatsApp Number</label>
          <input className="input mt-1" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      <div className="card p-5 mt-4 space-y-4">
        <h2 className="font-display font-bold">Your Store's "About" Page</h2>
        <p className="text-xs text-black/40 -mt-2">
          Shown first when someone opens your catalogue link, before they see your products.
        </p>
        <div>
          <label className="text-sm font-medium">Store description</label>
          <textarea
            className="input mt-1 min-h-[90px]"
            placeholder="Tell customers what your business is about…"
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Cover photo</p>
          {business?.storeCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.storeCoverUrl} alt="Store cover" className="w-full h-32 rounded-xl object-cover border border-black/10 mb-2" />
          )}
          <ImageUpload label="Upload cover photo" onUploaded={saveCoverUrl} />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-secondary w-full">
          {saving ? "Saving…" : "Save Store Page"}
        </button>
      </div>

      <div className="card p-5 mt-4 space-y-4">
        <h2 className="font-display font-bold">Receiving Bank Account</h2>
        <p className="text-xs text-black/40 -mt-2">
          Where customers pay you directly for catalogue orders placed online (not via WhatsApp).
        </p>
        <div>
          <label className="text-sm font-medium">Bank name</label>
          <input className="input mt-1" value={receivingBankName} onChange={(e) => setReceivingBankName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Account number</label>
          <input className="input mt-1" value={receivingAccountNumber} onChange={(e) => setReceivingAccountNumber(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Account name</label>
          <input className="input mt-1" value={receivingAccountName} onChange={(e) => setReceivingAccountName(e.target.value)} />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-secondary w-full">
          {saving ? "Saving…" : "Save Bank Details"}
        </button>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-display font-bold mb-1">Appearance</h2>
        {!planUnlocks(business, "standard") ? (
          <p className="text-sm text-black/40 mt-1">
            🔒 Dark mode and custom colors are available from Standard.{" "}
            <a href="/dashboard/upgrade" className="text-bamyon-green font-medium">Upgrade</a>
          </p>
        ) : (
          <ThemeSettings />
        )}
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-display font-bold mb-1">Business Logo</h2>
        {!isPremium ? (
          <p className="text-sm text-black/40 mt-1">
            🔒 Logo upload and AI logo generation are Premium features.{" "}
            <a href="/dashboard/upgrade" className="text-bamyon-green font-medium">Upgrade</a>
          </p>
        ) : (
          <div className="space-y-5 mt-3">
            {business?.logoUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={business.logoUrl} alt="Current logo" className="w-16 h-16 rounded-xl object-cover border border-black/10" />
                <p className="text-sm text-black/50">Your current logo</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Upload your own</p>
              <ImageUpload label="Upload logo" onUploaded={saveLogoUrl} value={business?.logoUrl} />
            </div>

            <div className="border-t border-black/5 pt-4">
              <p className="text-sm font-medium mb-2">Or generate one free with AI</p>
              <AiLogoGenerator />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
