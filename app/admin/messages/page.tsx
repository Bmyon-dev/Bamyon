"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, orderBy, query, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { MessageDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { amplifyText } from "@/lib/pollinationsText";

export default function AdminMessagesPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [amplifying, setAmplifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MessageDoc))),
      toast.error,
      "Messages"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const threads = useMemo(() => {
    const map = new Map<string, { businessName: string; last: MessageDoc }>();
    for (const m of messages) {
      map.set(m.businessId, { businessName: m.businessName, last: m });
    }
    return Array.from(map.entries());
  }, [messages]);

  const activeThread = selected
    ? messages.filter((m) => m.businessId === selected)
    : [];

  async function send() {
    if (!selected || !text.trim()) return;
    const business = threads.find(([id]) => id === selected)?.[1];
    setSending(true);
    const toastId = toast.loading("Sending reply…");
    try {
      await addDoc(collection(db, "messages"), {
        businessId: selected,
        businessName: business?.businessName || "",
        sender: "admin",
        text: text.trim(),
        createdAt: Date.now(),
        read: true,
      });
      toast.success("Reply sent", toastId);
      setText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send", toastId);
    } finally {
      setSending(false);
    }
  }

  async function handleAmplify() {
    if (!text.trim()) return;
    setAmplifying(true);
    setError("");
    const toastId = toast.loading("Improving your reply with AI…");
    try {
      const improved = await amplifyText(text, "A Bamyon support admin replying to a business owner");
      setText(improved);
      toast.success("Reply improved", toastId);
    } catch (err: any) {
      setError(err.message || "AI rewrite failed");
      toast.error(err.message || "AI rewrite failed", toastId);
    } finally {
      setAmplifying(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Messages</h1>
      <p className="text-black/50 mt-1">Conversations with business owners.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-5">
        <div className="card divide-y divide-black/5 sm:col-span-1 max-h-[500px] overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-black/40 text-sm p-6 text-center">No conversations yet.</p>
          ) : (
            threads.map(([id, t]) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`w-full text-left px-4 py-3 text-sm ${selected === id ? "bg-bamyon-green/10" : ""}`}
              >
                <p className="font-medium">{t.businessName}</p>
                <p className="text-black/40 text-xs truncate">{t.last.text}</p>
              </button>
            ))
          )}
        </div>

        <div className="card sm:col-span-2 flex flex-col h-[500px]">
          {!selected ? (
            <p className="text-black/40 text-sm m-auto">Select a conversation</p>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {activeThread.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.sender === "admin" ? "bg-bamyon-green text-white ml-auto" : "bg-black/5"
                    }`}
                  >
                    {m.sender !== "admin" && (
                      <p className="text-[10px] font-semibold opacity-60 capitalize">
                        {m.senderName || m.sender}{m.sender === "staff" ? " (staff)" : ""}
                      </p>
                    )}
                    {m.text}
                    <div className="text-[10px] opacity-60 mt-1">{formatDate(m.createdAt)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-black/5 p-3 space-y-2">
                {error && <p className="text-red-600 text-xs">{error}</p>}
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Reply…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                  />
                  <button onClick={handleAmplify} disabled={amplifying || !text.trim()} className="btn-secondary px-3 text-sm whitespace-nowrap">
                    {amplifying ? "…" : "✨ Amplify"}
                  </button>
                  <button onClick={send} disabled={sending} className="btn-primary px-5">
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
