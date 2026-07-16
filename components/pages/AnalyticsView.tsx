"use client";

import { useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira } from "@/lib/format";
import { amplifyText } from "@/lib/pollinationsText";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

interface Sale { total: number; createdAt: number; lineItems?: { name: string; qty: number }[] }

const DAYS = 14;

export default function AnalyticsView() {
  const { business } = useAuth();
  const toast = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [suggestions, setSuggestions] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "sales"),
      (snap) => setSales(snap.docs.map((d: any) => d.data() as Sale)),
      toast.error,
      "Analytics"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const totalSales = sales.reduce((s, r) => s + (r.total || 0), 0);

  const tally: Record<string, number> = {};
  sales.forEach((s) => (s.lineItems || []).forEach((li) => {
    if (!li.name) return;
    tally[li.name] = (tally[li.name] || 0) + li.qty;
  }));
  const bestSellers = Object.entries(tally)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Build a 14-day trend, filling in zero-sale days so the chart isn't misleading.
  const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const dayTotals = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    dayTotals.set(key, 0);
  }
  sales.filter((s) => s.createdAt >= since).forEach((s) => {
    const key = new Date(s.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    dayTotals.set(key, (dayTotals.get(key) || 0) + s.total);
  });
  const trend = Array.from(dayTotals.entries()).reverse().map(([date, total]) => ({ date, total }));

  async function getSuggestions() {
    setLoadingSuggestions(true);
    setSuggestionsError("");
    try {
      const summary = `Business category: ${business?.category || "general retail"}. ` +
        `Total sales recorded: ${formatNaira(totalSales)} across ${sales.length} transactions. ` +
        `Best sellers: ${bestSellers.map((b) => `${b.name} (${b.qty} sold)`).join(", ") || "not enough data yet"}.`;

      const prompt = `As a business growth advisor for a small Nigerian business, give exactly 3 short, concrete, numbered suggestions to increase sales, based on this data: ${summary}`;
      const result = await amplifyText(prompt, "Business growth suggestions, numbered list, no preamble");
      setSuggestions(result);
    } catch (err: any) {
      setSuggestionsError(err.message || "Couldn't generate suggestions right now");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Analytics</h1>
      <p className="text-black/50 mt-1">All-time performance for your business.</p>

      <div className="card p-6 mt-5">
        <p className="text-black/50 text-sm">All-time revenue</p>
        <p className="text-3xl font-extrabold mt-1">{formatNaira(totalSales)}</p>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-display font-bold mb-3">Sales trend (last {DAYS} days)</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatNaira(v)} />
              <Line type="monotone" dataKey="total" stroke="#0d6b4f" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-display font-bold mb-3">Best sellers</h2>
        {bestSellers.length === 0 ? (
          <p className="text-black/40 text-sm text-center py-6">Not enough sales data yet.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellers} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="qty" fill="#f5a623" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card p-5 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">✨ AI Growth Suggestions</h2>
          <button onClick={getSuggestions} disabled={loadingSuggestions} className="btn-secondary text-sm px-4 py-2">
            {loadingSuggestions ? "Thinking…" : suggestions ? "Regenerate" : "Get Suggestions"}
          </button>
        </div>
        {suggestionsError && <p className="text-red-600 text-sm mt-3">{suggestionsError}</p>}
        {suggestions && (
          <div className="text-sm text-black/70 mt-3 whitespace-pre-line">{suggestions}</div>
        )}
        {!suggestions && !loadingSuggestions && !suggestionsError && (
          <p className="text-black/40 text-sm mt-3">
            Get free, AI-generated ideas to grow your sales based on your own data.
          </p>
        )}
      </div>
    </div>
  );
}
