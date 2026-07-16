"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Logo from "@/components/Logo";
import { BlogPostDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "blogPosts"), where("published", "==", true), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogPostDoc)));
      } catch (err) {
        console.error("Failed to load blog posts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-bamyon-cream">
      <nav className="bg-white border-b border-black/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/signup" className="btn-primary text-sm px-5 py-2">Get Started Free</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-bold">The Bamyon Blog</h1>
        <p className="text-black/60 mt-2">Tips, stories, and ideas for running a Nigerian small business.</p>

        {loading ? (
          <p className="text-black/40 text-sm mt-10 text-center">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-black/40 text-sm mt-10 text-center">No posts yet — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 mt-8">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden block hover:shadow-md transition-shadow">
                {p.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImageUrl} alt={p.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5">
                  <h2 className="font-display font-bold">{p.title}</h2>
                  <p className="text-xs text-black/40 mt-1">{formatDate(p.createdAt)} · {p.authorName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
