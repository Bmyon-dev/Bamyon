"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, doc, updateDoc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { BlogPostDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";
import ImageUpload from "@/components/ImageUpload";

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminBlogPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", authorName: "Bamyon Team", coverImageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPosts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as BlogPostDoc))),
      toast.error,
      "Blog posts"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setEditingId(null);
    setForm({ title: "", body: "", authorName: "Bamyon Team", coverImageUrl: "" });
    setShowForm(true);
  }

  function startEdit(p: BlogPostDoc) {
    setEditingId(p.id);
    setForm({ title: p.title, body: p.body, authorName: p.authorName, coverImageUrl: p.coverImageUrl || "" });
    setShowForm(true);
  }

  async function save(publish: boolean) {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    const toastId = toast.loading("Saving post…");
    try {
      if (editingId) {
        await updateDoc(doc(db, "blogPosts", editingId), {
          title: form.title, body: form.body, authorName: form.authorName,
          coverImageUrl: form.coverImageUrl || null, published: publish,
        });
      } else {
        await addDoc(collection(db, "blogPosts"), {
          title: form.title, slug: slugify(form.title), body: form.body,
          authorName: form.authorName, coverImageUrl: form.coverImageUrl || null,
          published: publish, createdAt: Date.now(),
        });
      }
      toast.success(publish ? "Post published" : "Draft saved", toastId);
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(p: BlogPostDoc) {
    try {
      await updateDoc(doc(db, "blogPosts", p.id), { published: !p.published });
      toast.success(p.published ? "Unpublished" : "Published");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  }

  async function remove(p: BlogPostDoc) {
    const toastId = toast.loading("Deleting post…");
    try {
      await deleteDoc(doc(db, "blogPosts", p.id));
      toast.success("Post deleted", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete", toastId);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Blog</h1>
          <p className="text-black/50 mt-1">Bamyon's SEO content hub.</p>
        </div>
        <button onClick={startNew} className="btn-primary text-sm px-4 py-2">+ New Post</button>
      </div>

      {showForm && (
        <div className="card p-5 mt-4 space-y-3">
          <input className="input" placeholder="Post title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Author name" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
          <ImageUpload label="Cover image" onUploaded={(url) => setForm({ ...form, coverImageUrl: url })} value={form.coverImageUrl} />
          <div>
            <ImageUpload
              label="Insert image into post"
              onUploaded={(url) => setForm((f) => ({ ...f, body: `${f.body}\n\n![](${url})\n\n` }))}
            />
            <p className="text-xs text-black/40 mt-1">Uploads and drops the image right into your post text below.</p>
          </div>
          <textarea className="input min-h-[180px]" placeholder="Write your post…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={saving} className="btn-primary flex-1 text-sm">Publish</button>
            <button onClick={() => save(false)} disabled={saving} className="btn-secondary flex-1 text-sm">Save Draft</button>
            <button onClick={() => setShowForm(false)} className="text-black/40 text-sm px-3">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {posts.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">No posts yet.</div>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="card p-5 flex items-center justify-between">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-black/40 mt-1">{formatDate(p.createdAt)} · {p.authorName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold rounded-full px-3 py-1 ${p.published ? "bg-bamyon-green/10 text-bamyon-green" : "bg-black/5 text-black/50"}`}>
                  {p.published ? "Published" : "Draft"}
                </span>
                <button onClick={() => togglePublish(p)} className="text-xs text-bamyon-green font-medium">
                  {p.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => startEdit(p)} className="text-xs text-black/50 font-medium">Edit</button>
                <button onClick={() => remove(p)} className="text-xs text-red-600 font-medium">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
