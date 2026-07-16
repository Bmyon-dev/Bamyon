# Bamyon — Next.js + Firebase (client-only, no service account)

Production build of Bamyon: business owners self-register, manage their
own dashboard, and add staff with page-level permissions in a separate
staff interface. Owners fund a wallet via bank transfer, you approve it
from a separate admin console, and they spend that balance on plan
upgrades or a flat-fee Hire-a-Designer request.

**This build uses only Firestore, Firebase Authentication, and
Cloudinary — no Firebase Admin SDK, no service account key, anywhere.**
Every write that used to go through a server route now happens directly
from the browser, with Firestore Security Rules doing the enforcement
instead of trusted server code. That trade-off is explained in full
under "How this stays secure without a server" below — read it before
you go live, it affects how much you can trust the wallet balance field.

## 1. Firebase setup

1. Create a Firebase project at console.firebase.google.com.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create in production mode.
4. **Project settings → General** → add a Web app → copy the config into
   `.env.local` (`NEXT_PUBLIC_FIREBASE_*` values). That's the only Firebase
   credential this app needs — no service account, no private key.
5. Deploy `firestore.rules` (Firebase console → Firestore → Rules → paste
   the file's contents → Publish, or `firebase deploy --only firestore:rules`
   if you have the CLI). **This step matters more than usual in this
   build** — the rules are the only thing enforcing the money logic.
6. Create the composite indexes in `firestore.indexes.json` — either
   `firebase deploy --only firestore:indexes` if you have the CLI, or
   skip this for now: if a page needs an index it doesn't have yet,
   you'll see a toast saying so, with a direct "create it" link logged to
   the browser console (F12 → Console tab). Click it, wait ~1-2 minutes,
   refresh.

## 2. Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the values from step 1
npm run dev
```

## 3. Create your Bamyon admin login

There's no Admin SDK left to run a seed script with, so this is now a
two-step manual process — still only takes a minute:

1. Go to `/signup` and register a normal account (business name can be
   anything, e.g. "Bamyon HQ").
2. Open **Firebase console → Firestore Database → Data**, find
   `users/{the uid you just created}`, and change its `role` field from
   `"owner"` to `"admin"`. Set `businessId` to `null` while you're there.
3. Log in at `/admin/login` with that same email/password.

This account manages every business's payments and support messages — it
has no special access to any single business's sales data beyond what the
rules already grant an admin (see `firestore.rules`).

## 4. Deploy to Vercel

```bash
vercel
```

Add every variable from `.env.local` to the Vercel project's Environment
Variables (Settings → Environment Variables) before deploying.

## How this stays secure without a server

Three things used to require a trusted server (the Admin SDK) and now
don't:

**Staff accounts** — creating a Firebase Auth user with the client SDK
normally signs you in as that new user, which would kick the owner out of
their own session. The fix: `lib/staffActions.ts` spins up a second,
throwaway Firebase app instance just to create the account, then throws
it away — the owner's real session never moves. This is a standard
client-only pattern, not a workaround with side effects.

**Plan upgrades & Hire-a-Designer** — the risky one. Without a server,
nothing stops a technically savvy owner from opening devtools and trying
to write `walletBalance: 999999999` directly to their own business
document. `firestore.rules` is what actually prevents this:
`businesses/{id}` can only have its `walletBalance` *decrease*, never
increase, and only by one of the exact known prices (₦2,500, ₦5,000,
₦15,000, ..., ₦2,000 for a designer) hardcoded into the rule itself. It
can never go negative. The only way `walletBalance` *increases* is
through the admin-approval path, which requires `isAdmin()` — a real,
separately-authenticated admin login, not a client trick. Read
`firestore.rules` end to end before trusting this with real money; the
comments in there explain each case.

**One residual gap, worth knowing about**: the Hire-a-Designer request
and its wallet deduction happen in the same client transaction, but
Firestore rules can't *fully* force two separate documents to change
together the way a server transaction guarantee can. The rule requires
the business to have had ≥₦2,000 at request time as a second check, which
closes most of the gap, but a determined attacker bypassing the app's UI
entirely could theoretically create a request without the paired
deduction. If Hire-a-Designer volume grows enough that this risk
matters, move just that one action to a small serverless function later
— everything else in this app doesn't have this issue because it's a
single-document write.

**CRM email campaigns** — this is the one place a real secret
(`RESEND_API_KEY`) has to live server-side, so it's still a Next.js API
route (`/api/crm/send-campaign`) — but it doesn't use the Admin SDK
either. It verifies the caller's Firebase ID token by checking its
signature against Google's public keys (`lib/verifyIdToken.ts`, via the
`jose` package — no service account), then reads Firestore over its
public REST API using that same ID token as the auth header
(`lib/firestoreRest.ts`) — meaning the read is subject to your normal
Firestore rules, exactly as if the owner had made it from the browser.
No elevated access exists anywhere in this route.

## Staff accounts

Only the business owner can create staff logins (`/dashboard/staff`).
Staff log in at the same `/login` page but land in a completely separate
interface at `/staff` — not the owner dashboard with things hidden.
Visiting `/dashboard` as staff (or `/staff` as an owner) redirects to the
right place. Every staff page is wrapped in `StaffGate`
(`components/StaffGate.tsx`), which checks *both* the specific permission
the owner granted *and* the business's current plan tier — a staff member
can't use a feature the business hasn't paid for even if the box was
ticked. Staff-account limits by plan (0 on Free, 1 on Standard, unlimited
on Premium+) are enforced in `lib/staffActions.ts`.

## Live status on every write

Every action that touches the network — logging a sale, saving settings,
uploading an image, approving a payment, sending a campaign — now shows a
toast notification bottom-right: a loading spinner while it's in flight,
then a green ✓ or red ✕ with what happened. This is `contexts/ToastContext.tsx`;
call `useToast()` from any component and use `.loading()` / `.success()` /
`.error()`. If you add a new write anywhere, wire it into this — it's what
makes the app feel alive instead of leaving you guessing whether a tap
did anything.

## Signup speed

Signup navigates to the verification screen the instant the Firebase Auth
account is created — it doesn't wait for the business/user Firestore
documents to finish writing first. Those finish in the background
(typically well under a second) and `AuthContext` picks them up via a live
listener the moment they land. If you ever see a brief flash of "loading"
on the verify-email or onboarding screen, that's what you're seeing — it
resolves itself.

## Cloudinary setup

Used for logo uploads, review screenshots, and catalogue product photos.

1. Create a free account at cloudinary.com.
2. Dashboard home page shows your **Cloud Name** — copy it into
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. Settings → Upload → Upload presets → Add upload preset → set **Signing
   Mode to "Unsigned"** → Save. Copy the preset name into
   `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
4. That's it — uploads go straight from the browser to Cloudinary, no
   server involved, no secret key exposed.

## Free AI logo generation

Settings → Business Logo (Premium) also offers "Generate one free with AI",
powered by Pollinations.ai — a free, keyless image API. No signup, no
billing, nothing to configure.

## Resend setup (Premium Pro email campaigns)

1. Create a free account at resend.com.
2. Add and verify a sending domain (or use their test domain while
   developing).
3. API Keys → create one → copy into `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on your verified domain, e.g.
   `"Bamyon <hello@yourdomain.com>"`.
5. Without this configured, the CRM page still lets an owner compose and
   select recipients, but sending fails with a clear "not configured yet"
   error instead of silently doing nothing.
6. Worth repeating from the feature description itself: this sends from a
   verified address via Resend, not literally through the owner's Gmail
   account. True Gmail-as-sender needs Google OAuth consent per business
   owner — a much bigger, riskier integration than this one.

## How the wallet/upgrade flow works

1. Owner opens **Wallet**, sees your bank account, transfers money, taps
   "I have transferred", enters the amount → creates a `pending` row in
   `deposits`.
2. You open `/admin/payments`, tap **Approve** → a client-side Firestore
   transaction (run from your own authenticated admin session) marks the
   deposit approved and credits `walletBalance`.
3. Owner opens **Upgrade Plan**, picks a plan + billing cycle, taps
   **Upgrade Now** → a client-side transaction deducts the cost and sets
   `plan` + `planExpiry`, validated against `firestore.rules` as described
   above. They immediately see the new expiry date and the sidebar
   unlocks those pages.
4. **You still need a scheduled job** (a Vercel Cron hitting a small API
   route) that checks for `planExpiry < now` and resets `plan` to `free`
   — this build checks expiry client-side for *display* purposes, but
   nothing currently downgrades an expired plan on its own. Add that
   before relying on this in production.

## Net Worth tracker (Premium)

Logging a purchase increases inventory automatically (and records the
latest unit cost); logging a sale decreases it for any matching item
name — see `lib/inventory.ts`. Net Worth (`/dashboard/networth`) is
inventory value (stock × last cost) + wallet balance, with a full
breakdown. It's an estimate from logged data, not an audited valuation —
said plainly on the page itself.

## Public catalogue storefront

`/c/[businessId]`, no login required. Shows a business's products;
"Order via WhatsApp" opens a prefilled chat with the owner's WhatsApp
number and the product's name/price. Backed by a `storefronts` collection
that mirrors only the public-safe fields (name, WhatsApp number, logo,
address, products) — the real `businesses` document with wallet balance,
email, etc. is never exposed publicly; see the `storefronts` rules in
`firestore.rules`.

## 5 pricing tiers

Free, Standard, Premium, Premium Pro (₦15,000/mo), and Enterprise
("Contact Sales" — not part of the wallet flow, routes to Customer Care
instead). Full feature lists in `lib/types.ts` — 5 headline features per
paid tier.

## Automation (Premium Pro — listed, not built)

Automatic email/WhatsApp on every logged sale needs a scheduled Cloud
Function plus the WhatsApp Business API (which requires Meta Business
verification, unlike the free `wa.me` links used everywhere else in this
app) — deliberately out of scope for now. It's on the pricing page as a
sold feature, not silently missing, so you know to build it before
promising it to a Premium Pro customer.

## What changed in v5

### The critical fix — you couldn't reach the dashboard
Found and fixed the actual root cause: signup fired two independent
Firestore writes (`businesses/{id}` and `users/{id}`) at the same time,
unawaited, with every error silently swallowed (`.catch(() => {})`). If
either write lost the race or failed, you'd land on onboarding or the
dashboard with no account data and zero indication anything went wrong —
the onboarding button looked "dead" because it was silently returning on
a null check, and the dashboard spun forever waiting for data that would
never arrive.

Fixed at the root:
- **Signup now writes both documents in one atomic `writeBatch`**,
  awaited before navigating anywhere. Either both documents land or
  neither does — there's no window where one exists without the other.
- **Every Firestore listener in the app now has an error handler**
  (`lib/firestoreListen.ts` — a wrapper around `onSnapshot` used
  everywhere), so a permission error or missing index shows a toast
  instead of an infinite spinner. This touched 21 files.
- **Onboarding uses `setDoc(..., {merge:true})` instead of `updateDoc`**,
  so it can never fail with "document doesn't exist," plus a real
  try/catch with a visible error and a retry-friendly loading guard.
- **Dashboard and staff layouts now time out after 6 seconds** of being
  stuck on "loading" and show a Retry / Log Out screen instead of
  spinning forever.
- **Login now resumes exactly where an owner left off**: unverified →
  verify-email, verified-but-not-onboarded → onboarding, done → dashboard.
  Previously login always sent owners straight to `/dashboard`, which is
  how a verified-but-not-onboarded owner could get stuck.
- **`firestore.indexes.json` added** — several admin/owner list pages
  filter and sort on different fields (e.g. pending payments, sorted by
  date), which Firestore requires a composite index for. Deploy it with
  `firebase deploy --only firestore:indexes`, or just click through each
  admin/owner page once — Firestore's error (now visible via toast +
  console) includes a direct link to auto-create the exact index needed.

### AI receipt/invoice scanning (Premium)
Log Sales and Log Purchases both now have a "📷 Scan a receipt" section
for Premium+ businesses. Take or upload a photo; it's sent to
Pollinations.ai's free, keyless vision endpoint
(`lib/pollinationsVision.ts`), which reads back structured line items
that pre-fill the form. **It never auto-saves** — the extracted items
land in the editable form fields for a human to check before submitting,
because receipt OCR is never perfect and a wrong number silently saved
into a sales log is worse than no automation at all. Log Purchases was
upgraded from single-item to multi-item to make scanned supplier invoices
actually useful.

### Review Automation (₦1,000 flat, any plan)
New page: Dashboard → Review Automation. An owner pastes their Google
Business review link and activates for a one-time ₦1,000 (from wallet
balance, same Firestore-rules-enforced pattern as everything else). Once
active, every sale logged with a customer phone number fires a webhook
(`/api/automation/notify` — keeps your n8n URL server-side) with the
customer's phone, the business name, and the review link. **You build the
actual SMS/WhatsApp send in n8n** — add a Webhook trigger node, wire it to
your SMS/WhatsApp provider of choice, paste the Production URL into
`N8N_WEBHOOK_URL`. This never blocks or fails a sale — if the webhook
call fails, it's logged server-side and the sale stays saved regardless.
Admin can see every business that's activated this at `/admin/automation`.
For businesses without a Google Business Profile yet: the plan was "admin
explains how" — that's a Customer Care conversation, not something baked
into the UI, since it's genuinely a personalized walkthrough.

### Withdrawals
New page: Dashboard → Withdraw. Owner enters an amount and their bank
details; the balance is **held immediately** (deducted at request time,
via the same wallet-balance transaction pattern used everywhere else) so
it can't also get spent on an upgrade while a payout is pending. You pay
out manually via your own bank transfer, then mark it approved at
`/admin/withdrawals`. If you reject a request instead, the held balance
is automatically refunded. See the updated `firestore.rules` — the
wallet-spend logic was simplified in this version: any *decrease* to a
business's own wallet balance is safe by construction (spending your own
money can't create value out of nothing), so withdrawals of arbitrary
owner-chosen amounts didn't need special-casing. Only *increases*, and
plan-upgrade decreases specifically, need the strict validation, and
still have it.

### Admin password
There's no way for me to create your Firebase Auth account for you — I
have no credentials or network access to your live project. Use the same
process as before (sign up normally, then flip `role` to `"admin"` in the
Firestore console — see step 3 above), and enter **`Infinix`** as the
password when you sign up (Firebase's minimum is 6 characters; this is
7). Change it afterward from the account's password-reset flow whenever
you're ready — there's no rush.

## What's simplified vs. your original Base44 prototype

- **Email verification** uses Firebase's native link-based verification
  instead of a custom 6-digit code — the flow Firebase Auth supports out
  of the box without standing up transactional email infrastructure.
- **Catalogue / CRM / Orders / Reviews / Analytics** are wired to real
  Firestore data with working reads/writes, but are intentionally simple
  — good pages to deepen further now that accounts, permissions, and
  billing all work end to end.

## Multi-currency (later)

Everything here is NGN-only by design, per your instruction to focus on
Nigeria first. When you're ready for USD/GBP: add a `currency` field to
signup, branch `PLAN_PRICES` in `lib/types.ts` by currency, and swap
`formatNaira` for a currency-aware formatter. The wallet/deposit/upgrade
flow doesn't need to change — it already carries `currency` on the
business doc.
