"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Logo from "@/components/Logo";
import { formatNaira } from "@/lib/format";

interface Storefront {
  name: string;
  whatsappNumber: string;
  logoUrl?: string;
  address?: string;
  description?: string;
  coverUrl?: string;
  receivingBankName?: string;
  receivingAccountNumber?: string;
  receivingAccountName?: string;
}
interface Product { id: string; name: string; price: number; imageUrl?: string; category?: string }
interface CartLine extends Product { qty: number }

export default function StorefrontPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [store, setStore] = useState<Storefront | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAbout, setShowAbout] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"choose" | "online" | "submitted">("choose");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const storeSnap = await getDoc(doc(db, "storefronts", businessId));
        if (!storeSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setStore(storeSnap.data() as Storefront);
        const productsSnap = await getDocs(collection(db, "storefronts", businessId, "products"));
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (businessId) load();
  }, [businessId]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  );

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing) return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { ...p, qty: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l))));
  }

  function whatsappCheckoutLink() {
    if (!store?.whatsappNumber) return "#";
    const lines = cart.map((l) => `${l.qty}x ${l.name} — ${formatNaira(l.price * l.qty)}`).join("\n");
    const msg = encodeURIComponent(
      `Hi ${store.name}, I'd like to order:\n\n${lines}\n\nTotal: ${formatNaira(cartTotal)}\n\nIs this available?`
    );
    return `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}?text=${msg}`;
  }

  async function submitOnlineOrder() {
    if (!buyer.name.trim() || !buyer.email.trim() || cart.length === 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "storeOrders"), {
        businessId,
        businessName: store?.name || "",
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        items: cart.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
        total: cartTotal,
        status: "awaiting_confirmation",
        createdAt: Date.now(),
      });

      // Best-effort email notification to the owner — never blocks the
      // buyer's confirmation screen if this fails.
      const bizSnap = await getDoc(doc(db, "businesses", businessId)).catch(() => null);
      const ownerEmail = bizSnap?.exists() ? (bizSnap.data() as any).email : null;
      fetch("/api/orders/notify-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail, businessName: store?.name, buyerName: buyer.name,
          buyerEmail: buyer.email, buyerPhone: buyer.phone,
          items: cart, total: cartTotal,
        }),
      }).catch(() => {});

      setCheckoutMode("submitted");
      setCart([]);
    } catch (err) {
      console.error("Order submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Logo />
        <p className="text-black/50 mt-4">This catalogue doesn't exist or isn't published yet.</p>
      </div>
    );
  }

  // ---------- About page (first screen) ----------
  if (showAbout) {
    return (
      <main className="min-h-screen bg-bamyon-cream">
        <div className="relative h-56 bg-bamyon-green">
          {store.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="max-w-2xl mx-auto px-6 -mt-14 pb-16">
          <div className="card p-6 text-center">
            {store.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="w-20 h-20 rounded-2xl object-cover mx-auto -mt-16 border-4 border-white shadow-md" />
            )}
            <h1 className="font-display text-2xl font-bold mt-3">{store.name}</h1>
            {store.address && <p className="text-black/40 text-sm mt-1">{store.address}</p>}
            {store.description && <p className="text-black/70 mt-4">{store.description}</p>}
            <button onClick={() => setShowAbout(false)} className="btn-primary w-full mt-6">
              Continue to Shop →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Shop view ----------
  return (
    <main className="min-h-screen bg-bamyon-cream pb-24">
      <header className="bg-bamyon-green text-white px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-xl object-cover border border-white/30" />
            )}
            <h1 className="font-display font-bold">{store.name}</h1>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative bg-white/15 rounded-full px-4 py-2 text-sm font-medium">
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-bamyon-amber text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        <div className="max-w-4xl mx-auto mt-4 flex gap-2 overflow-x-auto">
          <input
            className="flex-1 rounded-full px-4 py-2 text-sm text-black bg-white min-w-[140px]"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <div className="max-w-4xl mx-auto mt-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter("")}
              className={`text-xs font-medium rounded-full px-3 py-1.5 shrink-0 ${!categoryFilter ? "bg-bamyon-amber text-black" : "bg-white/15 text-white"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 shrink-0 ${categoryFilter === c ? "bg-bamyon-amber text-black" : "bg-white/15 text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <p className="text-black/40 text-sm text-center py-16">
            {products.length === 0 ? "No products listed yet — check back soon." : "No products match your search."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <div key={p.id} className="card overflow-hidden group">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-44 bg-black/5 flex items-center justify-center text-black/20 text-4xl">🛍️</div>
                )}
                <div className="p-4">
                  {p.category && <p className="text-xs text-bamyon-green font-medium">{p.category}</p>}
                  <h3 className="font-display font-bold mt-0.5">{p.name}</h3>
                  <p className="text-bamyon-green font-bold mt-1">{formatNaira(p.price)}</p>
                  <button onClick={() => addToCart(p)} className="btn-primary w-full text-center block mt-3 text-sm">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-black/5">
              <h2 className="font-display font-bold">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-black/40">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <p className="text-black/40 text-sm text-center mt-8">Your cart is empty.</p>
              ) : checkoutMode === "submitted" ? (
                <div className="text-center mt-8">
                  <p className="text-3xl">✓</p>
                  <p className="font-medium mt-2">Order submitted!</p>
                  <p className="text-black/50 text-sm mt-1">{store.name} will confirm your payment and reach out soon.</p>
                </div>
              ) : checkoutMode === "online" ? (
                <div className="space-y-3">
                  <button onClick={() => setCheckoutMode("choose")} className="text-bamyon-green text-xs font-medium">← Back</button>
                  {store.receivingAccountNumber ? (
                    <div className="bg-black/5 rounded-xl p-4 text-sm space-y-1">
                      <p className="text-xs text-black/50">Pay to:</p>
                      <p className="font-medium">{store.receivingBankName}</p>
                      <p className="font-mono font-bold">{store.receivingAccountNumber}</p>
                      <p>{store.receivingAccountName}</p>
                      <p className="text-xs text-black/50 mt-2">Amount: {formatNaira(cartTotal)}</p>
                    </div>
                  ) : (
                    <p className="text-amber-700 text-sm">This store hasn't set up online payment yet — please use WhatsApp checkout instead.</p>
                  )}
                  <input className="input text-sm" placeholder="Your name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
                  <input className="input text-sm" placeholder="Your email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
                  <input className="input text-sm" placeholder="Your phone" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
                  <button
                    onClick={submitOnlineOrder}
                    disabled={submitting || !buyer.name.trim() || !buyer.email.trim()}
                    className="btn-primary w-full text-sm"
                  >
                    {submitting ? "Submitting…" : "I Have Paid — Submit Order"}
                  </button>
                </div>
              ) : (
                cart.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-black/40 text-xs">{formatNaira(l.price)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(l.id, l.qty - 1)} className="w-6 h-6 rounded-full bg-black/5">-</button>
                      <span>{l.qty}</span>
                      <button onClick={() => updateQty(l.id, l.qty + 1)} className="w-6 h-6 rounded-full bg-black/5">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && checkoutMode === "choose" && (
              <div className="p-5 border-t border-black/5 space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatNaira(cartTotal)}</span>
                </div>
                <a href={whatsappCheckoutLink()} target="_blank" className="btn-primary w-full text-center block text-sm">
                  Checkout via WhatsApp
                </a>
                <button onClick={() => setCheckoutMode("online")} className="btn-secondary w-full text-sm">
                  Pay Online Instead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="text-center text-black/30 text-xs py-8">Powered by Bamyon</footer>
    </main>
  );
}
