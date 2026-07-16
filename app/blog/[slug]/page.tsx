"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import BlogBody from "@/components/BlogBody";
import { BlogCommentDoc, BlogPostDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { firebaseUser, userDoc, business } = useAuth();

  const [post, setPost] = useState<BlogPostDoc | null>(null);
  const [comments, setComments] = useState<BlogCommentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isLoggedIn = !!firebaseUser && !!userDoc;
  const [commentForm, setCommentForm] = useState({ name: "", email: "", phone: "", text: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const postsQ = query(collection(db, "blogPosts"), where("slug", "==", slug), where("published", "==", true));
        const postsSnap = await getDocs(postsQ);
        if (postsSnap.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const postDoc = { id: postsSnap.docs[0].id, ...postsSnap.docs[0].data() } as BlogPostDoc;
        setPost(postDoc);

        const commentsQ = query(collection(db, "blogComments"), where("postId", "==", postDoc.id), orderBy("createdAt", "asc"));
        const commentsSnap = await getDocs(commentsQ);
        setComments(commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogCommentDoc)));
      } catch (err) {
        console.error("Failed to load post:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  async function submitComment() {
    if (!post || !commentForm.text.trim()) return;
    if (!isLoggedIn && (!commentForm.name.trim() || !commentForm.email.trim())) return;
    setSubmittingComment(true);
    try {
      const identity = isLoggedIn
        ? {
            name: userDoc!.role === "owner" ? business?.name || userDoc!.name : userDoc!.name,
            email: userDoc!.email,
            phone: commentForm.phone.trim(),
            authorBusinessId: userDoc!.businessId,
            authorRole: userDoc!.role as "owner" | "staff",
            authorPhotoUrl: userDoc!.role === "owner" ? (business?.logoUrl || null) : (userDoc!.photoUrl || null),
            authorBusinessName: business?.name || null,
          }
        : {
            name: commentForm.name.trim(),
            email: commentForm.email.trim(),
            phone: commentForm.phone.trim(),
            authorBusinessId: null,
            authorRole: null,
            authorPhotoUrl: null,
            authorBusinessName: null,
          };

      const newComment = {
        postId: post.id,
        text: commentForm.text.trim(),
        createdAt: Date.now(),
        ...identity,
      };

      await addDoc(collection(db, "blogComments"), newComment);
      setComments((prev) => [...prev, { id: "temp", ...newComment } as BlogCommentDoc]);
      setCommentForm({ name: "", email: "", phone: "", text: "" });
      setCommentSent(true);
      setTimeout(() => setCommentSent(false), 3000);
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function subscribe() {
    if (!subscribeEmail.trim()) return;
    setSubscribing(true);
    try {
      await setDoc(doc(db, "emailSubscribers", subscribeEmail.trim().toLowerCase()), {
        email: subscribeEmail.trim().toLowerCase(),
        subscribedAt: Date.now(),
      });
      setSubscribed(true);
    } catch (err) {
      console.error("Failed to subscribe:", err);
    } finally {
      setSubscribing(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;
  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Logo />
        <p className="text-black/50 mt-4">This post doesn't exist.</p>
        <Link href="/blog" className="text-bamyon-green text-sm font-medium mt-2">← Back to blog</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bamyon-cream">
      <nav className="bg-white border-b border-black/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/signup" className="btn-primary text-sm px-5 py-2">Get Started Free</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/blog" className="text-bamyon-green text-sm font-medium">← All posts</Link>
        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-64 object-cover rounded-2xl mt-4" />
        )}
        <h1 className="font-display text-3xl font-bold mt-5">{post.title}</h1>
        <p className="text-black/40 text-sm mt-1">{formatDate(post.createdAt)} · {post.authorName}</p>

        <BlogBody text={post.body} />

        <div className="card p-5 mt-10 bg-bamyon-green text-white">
          <h3 className="font-display font-bold">Get Bamyon tips in your inbox</h3>
          {subscribed ? (
            <p className="text-sm mt-2">✓ Subscribed — thanks!</p>
          ) : (
            <div className="flex gap-2 mt-3">
              <input
                className="input text-black flex-1"
                placeholder="you@example.com"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
              />
              <button onClick={subscribe} disabled={subscribing} className="btn-amber text-sm px-4 shrink-0">
                {subscribing ? "…" : "Subscribe"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-10">
          <h3 className="font-display font-bold mb-4">Comments ({comments.length})</h3>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="card p-4 flex gap-3">
                {c.authorBusinessId ? (
                  <Link href={`/c/${c.authorBusinessId}`} className="shrink-0">
                    {c.authorPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.authorPhotoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-bamyon-green/10 text-bamyon-green font-bold flex items-center justify-center">
                        {c.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-black/5 text-black/40 font-bold flex items-center justify-center shrink-0">
                    {c.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.authorBusinessId ? (
                      <Link href={`/c/${c.authorBusinessId}`} className="font-medium text-sm hover:underline">{c.name}</Link>
                    ) : (
                      <p className="font-medium text-sm">{c.name}</p>
                    )}
                    {c.authorBusinessName && (
                      <span className="text-[10px] bg-bamyon-green/10 text-bamyon-green rounded-full px-2 py-0.5 font-medium capitalize">
                        {c.authorRole} at {c.authorBusinessName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-black/70 mt-1">{c.text}</p>
                  <p className="text-xs text-black/30 mt-1">{formatDate(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5 mt-4 space-y-3">
            <h4 className="font-medium">Leave a comment</h4>
            {isLoggedIn ? (
              <p className="text-xs text-black/50">
                Commenting as <span className="font-medium">{userDoc!.role === "owner" ? business?.name : userDoc!.name}</span>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input className="input text-sm" placeholder="Your name" value={commentForm.name} onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })} />
                <input className="input text-sm" placeholder="Your email" value={commentForm.email} onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })} />
              </div>
            )}
            <input className="input text-sm" placeholder="Phone (optional)" value={commentForm.phone} onChange={(e) => setCommentForm({ ...commentForm, phone: e.target.value })} />
            <textarea className="input text-sm" placeholder="Your comment…" value={commentForm.text} onChange={(e) => setCommentForm({ ...commentForm, text: e.target.value })} />
            {commentSent && <p className="text-bamyon-green text-sm">Comment posted!</p>}
            <button
              onClick={submitComment}
              disabled={submittingComment || !commentForm.text.trim() || (!isLoggedIn && (!commentForm.name.trim() || !commentForm.email.trim()))}
              className="btn-primary text-sm"
            >
              {submittingComment ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}
