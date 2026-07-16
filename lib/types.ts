export type PlanId = "free" | "standard" | "premium" | "premium_pro" | "enterprise";
export type PaidPlanId = Exclude<PlanId, "free" | "enterprise">;
export type BillingCycle = "monthly" | "6months" | "yearly";
export type UserRole = "owner" | "staff" | "admin";

// Every dashboard section a staff member could be granted access to.
export const PERMISSION_KEYS = [
  "sales",
  "purchases",
  "inventory",
  "debtors",
  "receipts",
  "invoices",
  "catalogue",
  "crm",
  "orders",
  "reviews",
  "analytics",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Permissions = Record<PermissionKey, boolean>;

export const NO_PERMISSIONS: Permissions = PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {} as Permissions
);

export interface UserDoc {
  uid: string;
  role: UserRole;
  businessId: string | null;
  email: string;
  name: string;
  photoUrl?: string;
  permissions?: Permissions; // only present for staff
  createdAt: number;
}

export interface BusinessDoc {
  id: string;
  name: string;
  ownerName: string;
  ownerUid: string;
  email: string;
  phone: string;
  category: string;
  address?: string;
  businessPhone?: string;
  whatsappNumber?: string;
  logoUrl?: string;
  storeDescription?: string;
  storeCoverUrl?: string;
  receivingBankName?: string;
  receivingAccountNumber?: string;
  receivingAccountName?: string;
  referredBy?: string; // businessId of whoever referred this business, if any
  theme?: { mode: "light" | "dark"; accentColor: string };
  plan: PlanId;
  planExpiry: number | null; // ms epoch, null = no active paid plan
  walletBalance: number; // in the business's chosen currency (NGN for now)
  currency: "NGN";
  emailVerified: boolean;
  onboarded: boolean; // has finished the post-verification profile setup step
  createdAt: number;
}

export interface DepositDoc {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  reference?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: number;
  resolvedAt?: number;
  note?: string;
}

export interface MessageDoc {
  id: string;
  businessId: string;
  businessName: string;
  sender: "owner" | "staff" | "admin";
  senderName?: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface InventoryItemDoc {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  sellingPrice?: number;
  updatedAt: number;
}

export interface StoreOrderDoc {
  id: string;
  businessId: string;
  businessName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: "awaiting_confirmation" | "confirmed" | "cancelled";
  createdAt: number;
}

export interface TransferDoc {
  id: string;
  fromBusinessId: string;
  fromBusinessName: string;
  toEmail: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  failReason?: string;
  requestedAt: number;
  resolvedAt?: number;
}

export const DESIGN_REQUEST_PRICE = 2000;

export interface DesignFeedbackEntry {
  from: "owner" | "admin";
  text: string;
  createdAt: number;
}

export interface DesignRequestDoc {
  id: string;
  businessId: string;
  businessName: string;
  brief: string;
  status: "pending" | "delivered";
  requestedAt: number;
  deliveredAt?: number;
  flyerUrl?: string;
  feedback?: DesignFeedbackEntry[];
}

export interface WithdrawalDoc {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: number;
  resolvedAt?: number;
}

export interface ReferralRecordDoc {
  id: string;
  referrerBusinessId: string;
  referredBusinessId: string;
  referredBusinessName: string;
  bonusPaid: boolean;
  createdAt: number;
}

export interface BlogPostDoc {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  body: string; // supports inline ![](url) images, rendered specially
  authorName: string;
  published: boolean;
  createdAt: number;
}

export interface BlogCommentDoc {
  id: string;
  postId: string;
  name: string;
  email: string;
  phone?: string;
  text: string;
  authorBusinessId?: string | null; // set when a logged-in owner/staff comments
  authorRole?: "owner" | "staff" | null;
  authorPhotoUrl?: string | null;
  authorBusinessName?: string | null;
  createdAt: number;
}

export const WEBSITE_REQUEST_PRICE = 10000;

export interface WebsiteRequestDoc {
  id: string;
  businessId: string;
  businessName: string;
  brief: string;
  status: "pending" | "in_progress" | "delivered";
  requestedAt: number;
  deliveredUrl?: string;
}

export const ADS_REQUEST_PRICE = 5000;

export interface AdsRequestDoc {
  id: string;
  businessId: string;
  businessName: string;
  brief: string;
  budget: string;
  status: "pending" | "in_progress" | "live";
  requestedAt: number;
  note?: string;
}

export const REFERRAL_BONUS = 500;

export const AUTOMATION_ACTIVATION_PRICE = 1000;

export interface AutomationSettingsDoc {
  active: boolean;
  googleReviewLink: string;
  activatedAt: number | null;
}

// Standard/Premium/Premium Pro are self-serve, paid from wallet balance.
// Enterprise is "Contact us" — custom pricing, not part of the wallet flow.
export const PLAN_PRICES: Record<PaidPlanId, Record<BillingCycle, number>> = {
  standard: { monthly: 2500, "6months": 13500, yearly: 25000 },
  premium: { monthly: 5000, "6months": 27000, yearly: 50000 },
  premium_pro: { monthly: 15000, "6months": 81000, yearly: 150000 },
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
  premium_pro: "Premium Pro",
  enterprise: "Enterprise",
};

// 5 headline features per paid tier, as requested — each tier's list is
// "everything above it" plus its own 5 additions in the UI layer.
export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: ["Log sales (limited)", "Basic dashboard summary", "1 business, 1 login"],
  standard: [
    "Unlimited Sales & Purchases logging",
    "Automatic Inventory tracking",
    "Debtors Tracker + WhatsApp reminders",
    "PDF Receipts & Invoices",
    "1 Staff Account + Basic Catalogue Link",
  ],
  premium: [
    "Unlimited Staff Accounts",
    "Customers / CRM, Orders & Reviews",
    "Analytics & Best-Sellers",
    "Net Worth Tracker",
    "Custom/AI Logo + branding removed from receipts",
  ],
  premium_pro: [
    "Automatic email/WhatsApp on every sale",
    "One-click email campaigns to past customers",
    "AI-assisted messaging tools",
    "Priority Customer Care",
    "Priority queue on Hire-a-Designer requests",
  ],
  enterprise: [
    "Multiple branches under one account",
    "Custom staff & permission structures",
    "Dedicated account manager",
    "Custom integrations & API access",
    "Custom pricing",
  ],
};

export const CYCLE_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  "6months": 182,
  yearly: 365,
};
