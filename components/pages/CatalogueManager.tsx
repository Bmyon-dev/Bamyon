"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import ImageUpload from "@/components/ImageUpload";
import { formatNaira } from "@/lib/format";

interface Product { id: string; name: string; price: number; imageUrl?: string; category?: string }

export default function CatalogueManager() {
  const { business } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "catalogue"),
      (snap) => setProducts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product))),
      toast.error,
      "Catalogue"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  // Keep the public storefront profile in sync whenever the business
  // profile changes — this is the public-safe mirror /c/[id] reads from.
  useEffect(() => {
    if (!business?.id) return;
    setDoc(
      doc(db, "storefronts", business.id),
      {
        name: business.name,
        whatsappNumber: business.whatsappNumber || business.businessPhone || "",
        logoUrl: business.logoUrl || null,
        address: business.address || "",
        description: business.storeDescription || "",
        coverUrl: business.storeCoverUrl || null,
        receivingBankName: business.receivingBankName || "",
        receivingAccountNumber: business.receivingAccountNumber || "",
        receivingAccountName: business.receivingAccountName || "",
        updatedAt: Date.now(),
      },
      { merge: true }
    ).catch(() => {});
  }, [
    business?.id, business?.name, business?.whatsappNumber, business?.businessPhone,
    business?.logoUrl, business?.address, business?.storeDescription, business?.storeCoverUrl,
    business?.receivingBankName, business?.receivingAccountNumber, business?.receivingAccountName,
  ]);

  async function addProduct() {
    if (!business?.id || !name || price <= 0) return;
    const toastId = toast.loading(`Adding ${name}…`);
    try {
      const ref = await addDoc(collection(db, "businesses", business.id, "catalogue"), {
        name, price, category: category || null, imageUrl: imageUrl || null, createdAt: Date.now(),
      });
      await setDoc(doc(db, "storefronts", business.id, "products", ref.id), {
        name, price, category: category || null, imageUrl: imageUrl || null, createdAt: Date.now(),
      });
      toast.success(`${name} added to catalogue`, toastId);
      setName(""); setPrice(0); setCategory(""); setImageUrl("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add product", toastId);
    }
  }

  async function remove(id: string, name: string) {
    if (!business?.id) return;
    const toastId = toast.loading(`Removing ${name}…`);
    try {
      await deleteDoc(doc(db, "businesses", business.id, "catalogue", id));
      await deleteDoc(doc(db, "storefronts", business.id, "products", id)).catch(() => {});
      toast.success(`${name} removed`, toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove product", toastId);
    }
  }

  const catalogueUrl = business && origin ? `${origin}/c/${business.id}` : "";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Catalogue</h1>
      <p className="text-black/50 mt-1">
        Your storefront — customers browse, search, and order online or via WhatsApp.
      </p>

      {catalogueUrl && (
        <div className="card p-4 mt-5 flex items-center justify-between text-sm">
          <span className="truncate text-black/60">{catalogueUrl}</span>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <a href={catalogueUrl} target="_blank" className="text-bamyon-green font-medium">Preview</a>
            <button
              onClick={() => navigator.clipboard.writeText(catalogueUrl)}
              className="text-bamyon-green font-medium"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      <div className="card p-5 mt-4 space-y-3">
        <h2 className="font-medium">Add a product</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="number" className="input" placeholder="Price" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <input className="input" placeholder="Category (optional — e.g. Drinks, Snacks)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <ImageUpload label="Add a photo (optional)" onUploaded={setImageUrl} value={imageUrl} />
        <button onClick={addProduct} className="btn-secondary">+ Add to catalogue</button>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        {products.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No products yet.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                )}
                <div>
                  <span className="font-medium block">{p.name}</span>
                  {p.category && <span className="text-xs text-black/40">{p.category}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{formatNaira(p.price)}</span>
                <button onClick={() => remove(p.id, p.name)} className="text-red-600 text-xs">Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
