"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { MessageDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function SupportChat() {
  const { business, userDoc } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "messages"),
      where("businessId", "==", business.id),
      orderBy("createdAt", "asc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MessageDoc))),
      toast.error,
      "Support messages"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function send() {
    if (!business?.id || !text.trim() || !userDoc) return;
    setSending(true);
    const toastId = toast.loading("Sending message…");
    try {
      await addDoc(collection(db, "messages"), {
        businessId: business.id,
        businessName: business.name,
        sender: userDoc.role === "staff" ? "staff" : "owner",
        senderName: userDoc.name,
        text: text.trim(),
        createdAt: Date.now(),
        read: false,
      });
      toast.success("Message sent", toastId);
      setText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send", toastId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Customer Care</h1>
      <p className="text-black/50 mt-1">Message the Bamyon team directly.</p>

      <div className="card mt-5 flex flex-col h-[420px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-black/40 text-sm text-center mt-10">
              Send a message and we'll get back to you.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  m.sender === "admin"
                    ? "bg-black/5 text-black"
                    : "bg-bamyon-green text-white ml-auto"
                }`}
              >
                {m.sender !== "admin" && m.senderName && (
                  <p className="text-[10px] opacity-70 font-medium">{m.senderName}</p>
                )}
                {m.text}
                <div className="text-[10px] opacity-60 mt-1">{formatDate(m.createdAt)}</div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-black/5 p-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button onClick={send} disabled={sending} className="btn-primary px-5">Send</button>
        </div>
      </div>
    </div>
  );
}
