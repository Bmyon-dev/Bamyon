import Link from "next/link";
import Logo from "@/components/Logo";
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES } from "@/lib/types";

const HERO_IMG = "https://images.unsplash.com/photo-1585540083814-ea6ee8af9e4f?w=1200&q=80&auto=format&fit=crop";
const FEATURE_IMG_1 = "https://images.unsplash.com/photo-1734255026082-82fdc81991f0?w=900&q=80&auto=format&fit=crop";
const FEATURE_IMG_2 = "https://images.unsplash.com/photo-1765584830351-b751c8937c75?w=900&q=80&auto=format&fit=crop";
const CTA_IMG = "https://images.unsplash.com/photo-1765584829902-51939816637c?w=1600&q=80&auto=format&fit=crop";

const FEATURES = [
  { icon: "🧾", title: "Log Sales in Seconds", desc: "Tap in items sold, mark paid or owing, done. Built for busy counters, not spreadsheets." },
  { icon: "📦", title: "Inventory That Updates Itself", desc: "Stock levels move automatically as you log sales and purchases — no manual recounting." },
  { icon: "💬", title: "WhatsApp Debt Reminders", desc: "One tap sends a polite reminder straight to a customer's WhatsApp when they owe you." },
  { icon: "🧮", title: "PDF Receipts & Invoices", desc: "Professional, branded documents your customers can trust — generated instantly." },
  { icon: "🛍️", title: "Your Own Catalogue Link", desc: "Share one link. Customers browse your products and order straight to your WhatsApp." },
  { icon: "👥", title: "Staff With Guardrails", desc: "Add staff logins and choose exactly which pages each person can see. Nothing more." },
];

const STEPS = [
  { n: "1", title: "Sign up free", desc: "No card required. You're logging your first sale in under two minutes." },
  { n: "2", title: "Run your day", desc: "Log sales and purchases as they happen — on your phone, at the counter." },
  { n: "3", title: "Grow when ready", desc: "Add staff, open your catalogue, and upgrade only when it pays for itself." },
];

const TESTIMONIALS = [
  { name: "Ngozi A.", role: "Boutique owner, Lagos", quote: "I used to close some nights not knowing if I made money. Now I know before I lock up." },
  { name: "Chuka O.", role: "Electronics shop, Port Harcourt", quote: "My staff log sales themselves now. I just check the dashboard from home." },
  { name: "Amina B.", role: "Skincare & beauty, Abuja", quote: "Customers order from my catalogue link straight to my WhatsApp. It just works." },
];

export default function LandingPage() {
  return (
    <main>
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Logo />
          <div className="hidden sm:flex items-center gap-7 text-sm font-medium text-black/60">
            <a href="#features" className="hover:text-black">Features</a>
            <a href="#pricing" className="hover:text-black">Pricing</a>
            <a href="#reviews" className="hover:text-black">Reviews</a>
            <Link href="/blog" className="hover:text-black">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-black/60 hover:text-black hidden sm:block">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary text-sm px-5 py-2.5">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-bamyon-green bg-bamyon-green/10 rounded-full px-4 py-1.5 text-sm font-medium">
            ⚡ Business-in-a-Box SaaS for Nigerian SMEs
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold mt-6 leading-tight">
            Run your business{" "}
            <span className="text-bamyon-green">from one dashboard.</span>
          </h1>
          <p className="text-black/60 text-lg mt-5">
            Log sales, track inventory, chase debtors, send invoices, and let
            customers order from your own WhatsApp-powered catalogue — all in
            one place, built for how Nigerian small businesses actually run.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/signup" className="btn-primary text-center">Start for Free →</Link>
            <Link href="#pricing" className="btn-secondary text-center">See Pricing</Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-sm text-black/50">
            <span>✓ No credit card required</span>
            <span>✓ Free tier forever</span>
            <span>✓ Works on any phone</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl overflow-hidden shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMG} alt="Nigerian small business owner at their stall" className="w-full h-[420px] object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-lg p-4 hidden sm:block">
            <p className="text-xs text-black/40">Today's Balance</p>
            <p className="font-display font-extrabold text-bamyon-green text-lg">₦84,500</p>
          </div>
          <div className="absolute -top-5 -right-5 bg-bamyon-amber text-black rounded-2xl shadow-lg px-4 py-2 hidden sm:block">
            <p className="text-xs font-semibold">✓ Sale logged</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-bamyon-cream py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Everything your business needs, nothing it doesn't
            </h2>
            <p className="text-black/60 mt-3">
              Built specifically for shops, salons, and small retailers — not
              repurposed enterprise software.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="w-11 h-11 rounded-xl bg-bamyon-green/10 flex items-center justify-center text-xl">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold mt-4">{f.title}</h3>
                <p className="text-black/60 text-sm mt-1.5">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mt-5">
            <div className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FEATURE_IMG_1} alt="Business owner tracking stock" className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="font-display font-bold">Never lose track of stock again</h3>
                <p className="text-black/60 text-sm mt-1.5">
                  Every sale and purchase adjusts your inventory automatically, so the numbers on your screen match what's actually on your shelf.
                </p>
              </div>
            </div>
            <div className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FEATURE_IMG_2} alt="Customers at a food stall" className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="font-display font-bold">Get paid faster, chase less</h3>
                <p className="text-black/60 text-sm mt-1.5">
                  Debtors are tracked automatically the moment you mark a sale as owing — with a WhatsApp reminder one tap away.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Up and running in minutes</h2>
          <p className="text-black/60 mt-3">No training, no setup calls, no waiting.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-bamyon-green text-white font-display font-bold text-lg flex items-center justify-center mx-auto">
                {s.n}
              </div>
              <h3 className="font-display font-bold mt-4">{s.title}</h3>
              <p className="text-black/60 text-sm mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-bamyon-cream py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Simple, honest pricing</h2>
            <p className="text-black/60 mt-3">Every business starts free. Upgrade only when it's paying for itself.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">
            <PriceCard
              name={PLAN_LABELS.free}
              price="₦0"
              tagline="Get a feel for it"
              features={PLAN_FEATURES.free}
            />
            <PriceCard
              name={PLAN_LABELS.standard}
              price={`₦${PLAN_PRICES.standard.monthly.toLocaleString()}`}
              tagline="For a growing shop"
              features={PLAN_FEATURES.standard}
            />
            <PriceCard
              name={PLAN_LABELS.premium}
              price={`₦${PLAN_PRICES.premium.monthly.toLocaleString()}`}
              tagline="Full business toolkit"
              features={PLAN_FEATURES.premium}
              highlighted
              badge="Most Popular"
            />
            <PriceCard
              name={PLAN_LABELS.premium_pro}
              price={`₦${PLAN_PRICES.premium_pro.monthly.toLocaleString()}`}
              tagline="Automate & grow"
              features={PLAN_FEATURES.premium_pro}
              badge="Best Value"
            />
            <PriceCard
              name={PLAN_LABELS.enterprise}
              price="Contact us"
              tagline="Custom, at scale"
              features={PLAN_FEATURES.enterprise}
              isEnterprise
            />
          </div>
          <p className="text-center text-black/40 text-sm mt-6">
            All prices are monthly. Save with 6-month or yearly billing — 2 months free on yearly.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Built for owners like you</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card p-6">
              <p className="text-bamyon-amber text-lg leading-none">★★★★★</p>
              <p className="text-black/70 text-sm mt-3">"{t.quote}"</p>
              <p className="font-display font-bold text-sm mt-4">{t.name}</p>
              <p className="text-black/40 text-xs">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CTA_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-bamyon-green/90" />
        <div className="relative max-w-3xl mx-auto text-center px-6 py-20 text-white">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Your business deserves better than a notebook.
          </h2>
          <p className="text-white/80 mt-3">
            Join Bamyon free today — no card, no commitment, just a clearer view of your business.
          </p>
          <Link href="/signup" className="btn-amber inline-block mt-7">
            Start for Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 pt-14 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-4 gap-8">
            <div className="sm:col-span-1">
              <Logo />
              <p className="text-black/50 text-sm mt-3">
                Business-in-a-Box for Nigerian small businesses.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-black/60">
                <li><a href="#features" className="hover:text-black">Features</a></li>
                <li><a href="#pricing" className="hover:text-black">Pricing</a></li>
                <li><Link href="/signup" className="hover:text-black">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-black/60">
                <li><Link href="/login" className="hover:text-black">Log in</Link></li>
                <li><Link href="/signup" className="hover:text-black">Create account</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-black/60">
                <li>Built in Nigeria 🇳🇬</li>
                <li>support@bamyon.app</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-black/5 mt-10 pt-6 text-center text-black/40 text-sm">
            © {new Date().getFullYear()} Bamyon. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function PriceCard({
  name,
  price,
  tagline,
  features,
  highlighted,
  badge,
  isEnterprise,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  isEnterprise?: boolean;
}) {
  return (
    <div className={`card p-6 flex flex-col ${highlighted ? "border-2 border-bamyon-green" : ""} ${isEnterprise ? "border-dashed border-black/15" : ""}`}>
      {badge && (
        <span className="self-start text-xs font-bold bg-bamyon-amber/20 text-bamyon-amberDark rounded-full px-2 py-1 mb-3">
          {badge}
        </span>
      )}
      <h3 className="font-display font-bold text-lg">{name}</h3>
      <p className="text-black/40 text-sm">{tagline}</p>
      <p className={`font-extrabold mt-4 ${isEnterprise ? "text-xl" : "text-3xl"}`}>
        {price}
        {!isEnterprise && price !== "₦0" && <span className="text-sm font-normal text-black/50">/mo</span>}
      </p>
      <ul className="space-y-2 mt-5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-black/70">
            <span className="text-bamyon-green mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={isEnterprise ? "/dashboard/support" : "/signup"}
        className={highlighted ? "btn-primary text-center" : "btn-secondary text-center"}
      >
        {isEnterprise ? "Contact Sales" : "Get Started"}
      </Link>
    </div>
  );
}
