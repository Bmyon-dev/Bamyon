"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/format";
import { planUnlocks } from "@/lib/permissions";

const GREEN: [number, number, number] = [13, 107, 79];
const AMBER: [number, number, number] = [245, 166, 35];
const GRAY: [number, number, number] = [110, 110, 110];

export default function InvoiceForm() {
  const { business } = useAuth();
  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const isPremium = planUnlocks(business, "premium");

  async function download() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const docPdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const pageHeight = docPdf.internal.pageSize.getHeight();
      const margin = 14;
      const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;

      docPdf.setFillColor(...GREEN);
      docPdf.rect(0, 0, pageWidth, 38, "F");
      docPdf.setFillColor(...AMBER);
      docPdf.rect(0, 38, pageWidth, 2, "F");

      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(20);
      docPdf.text(business?.name || "Bamyon", margin, 18);
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(9);
      const contactLine = [business?.address, business?.businessPhone].filter(Boolean).join("  ·  ");
      if (contactLine) docPdf.text(contactLine, margin, 26);

      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(14);
      docPdf.text("INVOICE", pageWidth - margin, 18, { align: "right" });
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(9);
      docPdf.text(`#${invoiceNo}`, pageWidth - margin, 24, { align: "right" });
      docPdf.text(new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }), pageWidth - margin, 29, { align: "right" });

      let y = 55;
      docPdf.setTextColor(...GRAY);
      docPdf.setFontSize(9);
      docPdf.text("BILLED TO", margin, y);
      docPdf.setTextColor(20, 35, 29);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.text(customer || "Customer", margin, y + 6);

      if (dueDate) {
        docPdf.setTextColor(...GRAY);
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(9);
        docPdf.text("DUE DATE", pageWidth - margin - 50, y);
        docPdf.setTextColor(20, 35, 29);
        docPdf.setFont("helvetica", "bold");
        docPdf.setFontSize(12);
        docPdf.text(new Date(dueDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }), pageWidth - margin - 50, y + 6);
      }

      y += 22;
      docPdf.setDrawColor(230, 230, 230);
      docPdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      docPdf.setTextColor(20, 35, 29);
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(11);
      docPdf.text(description || "Products / services rendered", margin, y);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(formatNaira(amount), pageWidth - margin, y, { align: "right" });

      y += 14;
      docPdf.setFillColor(...AMBER);
      docPdf.rect(pageWidth - margin - 78, y, 78, 12, "F");
      docPdf.setTextColor(20, 20, 20);
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.text("AMOUNT DUE", pageWidth - margin - 72, y + 8);
      docPdf.text(formatNaira(amount), pageWidth - margin - 4, y + 8, { align: "right" });

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

      docPdf.save(`invoice-${invoiceNo}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Generate Invoice</h1>
      <p className="text-black/50 mt-1">
        Bill a customer with a professional PDF invoice.
        {isPremium && <span className="text-bamyon-green"> Premium: Bamyon branding removed.</span>}
      </p>
      <div className="card p-5 mt-5 space-y-3">
        <input className="input" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <input className="input" placeholder="Description (e.g. Website design services)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="number" className="input" placeholder="Amount due (₦)" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <button onClick={download} disabled={generating || amount <= 0} className="btn-primary w-full mt-5">
        {generating ? "Generating…" : "Download PDF Invoice"}
      </button>
    </div>
  );
}

