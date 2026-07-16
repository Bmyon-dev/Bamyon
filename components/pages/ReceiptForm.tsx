"use client";

import { useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { planUnlocks } from "@/lib/permissions";

interface Line { desc: string; qty: number; price: number }
interface SaleOption { id: string; items: string; total: number; customerName: string; createdAt: number; lineItems?: { name: string; qty: number; price: number }[] }

const GREEN: [number, number, number] = [13, 107, 79];
const AMBER: [number, number, number] = [245, 166, 35];
const GRAY: [number, number, number] = [110, 110, 110];

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ReceiptForm() {
  const { business } = useAuth();
  const toast = useToast();
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([{ desc: "", qty: 1, price: 0 }]);
  const [generating, setGenerating] = useState(false);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const isPremium = planUnlocks(business, "premium");

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "sales"),
      (snap) => {
        const rows = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as SaleOption))
          .sort((a: SaleOption, b: SaleOption) => b.createdAt - a.createdAt)
          .slice(0, 30);
        setSales(rows);
      },
      toast.error,
      "Sales list"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  function pickSale(saleId: string) {
    setSelectedSaleId(saleId);
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    setCustomer(sale.customerName || "");
    if (sale.lineItems && sale.lineItems.length > 0) {
      setLines(sale.lineItems.map((li) => ({ desc: li.name, qty: li.qty, price: li.price })));
    } else {
      setLines([{ desc: sale.items, qty: 1, price: sale.total }]);
    }
  }

  async function download() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = (autoTableModule as any).default || (autoTableModule as any);

      const docPdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const margin = 14;
      const receiptNo = `BM-${Date.now().toString().slice(-8)}`;
      const dateStr = new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

      docPdf.setFillColor(...GREEN);
      docPdf.rect(0, 0, pageWidth, 38, "F");
      docPdf.setFillColor(...AMBER);
      docPdf.rect(0, 38, pageWidth, 2, "F");

      let nameX = margin;
      if (business?.logoUrl) {
        const dataUrl = await urlToDataUrl(business.logoUrl);
        if (dataUrl) {
          try {
            docPdf.addImage(dataUrl, "JPEG", margin, 6, 26, 26);
            nameX = margin + 32;
          } catch {
            // if the format guess is wrong, just skip the logo rather than fail the whole receipt
          }
        }
      }

      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(20);
      docPdf.text(business?.name || "Bamyon", nameX, 18);

      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(9);
      const contactLine = [business?.address, business?.businessPhone].filter(Boolean).join("  ·  ");
      if (contactLine) docPdf.text(contactLine, nameX, 26);

      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(14);
      docPdf.text("RECEIPT", pageWidth - margin, 18, { align: "right" });
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(9);
      docPdf.text(`#${receiptNo}`, pageWidth - margin, 24, { align: "right" });
      docPdf.text(dateStr, pageWidth - margin, 29, { align: "right" });

      let y = 50;
      docPdf.setTextColor(...GRAY);
      docPdf.setFontSize(9);
      docPdf.text("BILLED TO", margin, y);
      docPdf.setTextColor(20, 35, 29);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.text(customer || "Walk-in Customer", margin, y + 6);

      autoTable(docPdf, {
        startY: y + 14,
        margin: { left: margin, right: margin },
        head: [["Description", "Qty", "Unit Price", "Amount"]],
        body: lines
          .filter((l) => l.desc)
          .map((l) => [l.desc, String(l.qty), formatNaira(l.price), formatNaira(l.qty * l.price)]),
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 4, textColor: [20, 35, 29] },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 247, 245] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 38, halign: "right" },
          3: { cellWidth: 38, halign: "right" },
        },
      });

      const finalY = (docPdf as any).lastAutoTable.finalY + 4;

      docPdf.setFillColor(...AMBER);
      docPdf.rect(pageWidth - margin - 78, finalY, 78, 12, "F");
      docPdf.setTextColor(20, 20, 20);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.text("TOTAL", pageWidth - margin - 72, finalY + 8);
      docPdf.text(formatNaira(total), pageWidth - margin - 4, finalY + 8, { align: "right" });

      const pageHeight = docPdf.internal.pageSize.getHeight();
      docPdf.setTextColor(...GRAY);
      docPdf.setFont("helvetica", "italic");
      docPdf.setFontSize(10);
      docPdf.text("Thank you for your business!", pageWidth / 2, pageHeight - (isPremium ? 15 : 22), { align: "center" });

      if (!isPremium) {
        docPdf.setDrawColor(230, 230, 230);
        docPdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(8);
        docPdf.text("Powered by Bamyon · bamyon.app", pageWidth / 2, pageHeight - 12, { align: "center" });
      }

      docPdf.save(`receipt-${receiptNo}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Generate Receipt</h1>
      <p className="text-black/50 mt-1">
        Pick a logged sale, or fill one in manually.
        {isPremium && <span className="text-bamyon-green"> Premium: Bamyon branding removed.</span>}
      </p>

      {sales.length > 0 && (
        <div className="card p-4 mt-4">
          <label className="text-sm font-medium">Pick from a logged sale</label>
          <select className="input mt-1" value={selectedSaleId} onChange={(e) => pickSale(e.target.value)}>
            <option value="">— Enter manually instead —</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.createdAt)} — {s.items} — {formatNaira(s.total)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card p-5 mt-4 space-y-3">
        <input className="input" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        {lines.map((l, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="Description" value={l.desc}
              onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, desc: e.target.value } : x)))} />
            <input type="number" className="input" value={l.qty}
              onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} />
            <input type="number" className="input" placeholder="Price" value={l.price || ""}
              onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <button onClick={() => setLines((p) => [...p, { desc: "", qty: 1, price: 0 }])} className="text-bamyon-green text-sm font-medium">
          + Add line
        </button>
        <div className="flex justify-between border-t border-black/5 pt-3">
          <span className="text-black/60">Total</span>
          <span className="font-bold">{formatNaira(total)}</span>
        </div>
      </div>

      <button onClick={download} disabled={generating || total <= 0} className="btn-primary w-full mt-5">
        {generating ? "Generating…" : "Download PDF Receipt"}
      </button>
    </div>
  );
}
