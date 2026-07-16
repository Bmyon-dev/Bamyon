"use client";

import { useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { extractReceiptData, fileToBase64, ExtractedItem } from "@/lib/pollinationsVision";

export default function ReceiptScanner({
  kind,
  onExtracted,
}: {
  kind: "sale" | "purchase";
  onExtracted: (items: ExtractedItem[], counterpartyName?: string) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setScanning(true);
    const toastId = toast.loading("Reading receipt with AI…");
    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
      const result = await extractReceiptData(base64, kind);
      onExtracted(result.items, result.counterpartyName);
      toast.success(`Found ${result.items.length} item${result.items.length === 1 ? "" : "s"} — review before saving`, toastId);
    } catch (err: any) {
      const msg = err.message || "Scan failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="card p-5 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">📷 Scan a receipt</h2>
          <p className="text-xs text-black/40 mt-0.5">
            Snap a photo — AI reads the items so you don't have to type them.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex items-center gap-3 mt-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt preview" className="w-14 h-14 rounded-xl object-cover border border-black/10" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={scanning}
          className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
        >
          {scanning && <span className="w-3.5 h-3.5 border-2 border-bamyon-green/30 border-t-bamyon-green rounded-full animate-spin" />}
          {scanning ? "Reading…" : "Take / upload photo"}
        </button>
      </div>

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      <p className="text-xs text-black/30 mt-2">
        AI reading isn't always perfect — double-check the items it fills in before saving.
      </p>
    </div>
  );
}
