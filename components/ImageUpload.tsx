"use client";

import { useRef, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/contexts/ToastContext";

export default function ImageUpload({
  value,
  onUploaded,
  label = "Upload image",
}: {
  value?: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const toastId = toast.loading("Uploading image…");
    try {
      const url = await uploadToCloudinary(file);
      toast.success("Image uploaded", toastId);
      onUploaded(url);
    } catch (err: any) {
      const msg = err.message || "Upload failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex items-center gap-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="w-14 h-14 rounded-xl object-cover border border-black/10" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
        >
          {uploading && <span className="w-3.5 h-3.5 border-2 border-bamyon-green/30 border-t-bamyon-green rounded-full animate-spin" />}
          {uploading ? "Uploading…" : label}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
