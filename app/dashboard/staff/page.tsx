"use client";

import { useEffect, useState } from "react";
import { collection, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { NO_PERMISSIONS, PERMISSION_KEYS, Permissions } from "@/lib/types";
import { createStaffAccountClientSide } from "@/lib/staffActions";
import { activePlanOf } from "@/lib/permissions";
import ImageUpload from "@/components/ImageUpload";

const LABELS: Record<string, string> = {
  sales: "Log Sales",
  purchases: "Log Purchases",
  inventory: "Inventory",
  debtors: "Debtors",
  receipts: "Generate Receipt",
  invoices: "Generate Invoice",
  catalogue: "Catalogue",
  crm: "Customers / CRM",
  orders: "Orders",
  reviews: "Reviews",
  analytics: "Analytics",
};

interface StaffRow { id: string; name: string; email: string; permissions: Permissions; photoUrl?: string }

export default function StaffPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [perms, setPerms] = useState<Permissions>({ ...NO_PERMISSIONS });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "staff"),
      (snap) => setStaff(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as StaffRow))),
      toast.error,
      "Staff list"
    );
    return unsub;
  }, [business?.id]);

  async function handleCreate() {
    setError("");
    if (!business?.id) return;
    setSaving(true);
    const toastId = toast.loading(`Creating login for ${form.name}…`);
    try {
      await createStaffAccountClientSide({
        ownerBusinessId: business.id,
        activePlan: activePlanOf(business),
        name: form.name,
        email: form.email,
        password: form.password,
        permissions: perms,
      });
      toast.success(`Staff account created for ${form.name}`, toastId);
      setForm({ name: "", email: "", password: "" });
      setPerms({ ...NO_PERMISSIONS });
    } catch (err: any) {
      const msg = err.message || "Could not create staff account";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  async function savePhoto(staffId: string, url: string) {
    if (!business?.id) return;
    const toastId = toast.loading("Saving photo…");
    try {
      await updateDoc(doc(db, "businesses", business.id, "staff", staffId), { photoUrl: url });
      await updateDoc(doc(db, "users", staffId), { photoUrl: url }).catch(() => {
        // Non-fatal — the staff record itself still has the photo either way.
      });
      toast.success("Photo saved", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save photo", toastId);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!business?.id) return;
    const toastId = toast.loading(`Removing ${name}…`);
    try {
      await deleteDoc(doc(db, "businesses", business.id, "staff", id));
      toast.success(`${name} removed`, toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove staff", toastId);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Staff</h1>
      <p className="text-black/50 mt-1">
        Create logins for your staff. Each staff member only sees the pages you allow, in their own dashboard at <span className="font-mono text-xs">/staff</span>.
      </p>

      <div className="card mt-5 divide-y divide-black/5">
        {staff.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No staff accounts yet.</p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold">
                    {s.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-black/50">{s.email}</p>
                  <div className="mt-1">
                    <ImageUpload label={s.photoUrl ? "Change photo" : "Add photo"} onUploaded={(url) => savePhoto(s.id, url)} />
                  </div>
                </div>
              </div>
              <button onClick={() => handleRemove(s.id, s.name)} className="text-red-600 text-xs font-medium">
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card p-5 mt-5 space-y-4">
        <h2 className="font-display font-bold">Add Staff</h2>
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="password" placeholder="Temporary password (6+ chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <div>
          <p className="text-sm font-medium mb-2">Pages this staff member can access</p>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={perms[key]}
                  onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                />
                {LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? "Creating…" : "Create Staff Login"}
        </button>
      </div>
    </div>
  );
}
