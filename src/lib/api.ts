export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const TOKEN_KEY = "adplaylist_token";

export type Ad = {
  id: string;
  title: string;
  format: string;
  variant: "overlay" | "lockup";
  eyebrow?: string;
  headline: string;
  sub?: string;
  cta?: string;
  badge?: string;
  description?: string;
  primaryText?: string;
  brandName?: string;
  creativeDescription?: string;
  tags?: string[];
  mediaType: "image" | "video";
  swatch: string;
  light?: boolean;
  category: string;
  market: string;
  language: string;
  photo?: string;
  platforms: string[];
  editable: boolean;
  // Only sent when the viewer's plan includes editable copies;
  // hasEditableCopy says whether one exists either way.
  canvaUrl?: string;
  hasEditableCopy?: boolean;
  dominantColor?: string;
  videoLength?: string;
  // Picked by an admin to show on the landing page: `featured` in the
  // library section; `heroPlatforms` lists the hero panel tabs (META,
  // Google, LinkedIn) it was picked for.
  featured?: boolean;
  heroPlatforms?: string[];
  createdAt: string;

  // SEO page fields (from the ad's CSV). The long-form ones are only sent
  // for a single ad, not in lists.
  slug?: string;
  subcategory?: string;
  adFormat?: string;
  onImageText?: string;
  seoTitle?: string;
  metaDescription?: string;
  pageHeadline?: string;
  introParagraph?: string;
  imageFileName?: string;
  imageAlt?: string;
  imageCaption?: string;
  content?: AdContent;
  // "YYYY-MM-DD". dateAdded falls back to when the ad was published.
  dateAdded?: string;
  dateUpdated?: string;
  author?: Author;
  reviewer?: Author;
  // Only sent when saving: which authors to credit, by slug.
  authorSlug?: string;
  reviewerSlug?: string;
};

// The editorial sections of an ad's public page. Every part is optional.
export type AdContent = {
  takeaways?: { format?: string; bestFor?: string; hook?: string; reuse?: string };
  whyItWorks?: { title: string; text: string }[];
  targets?: string;
  copywriting?: string;
  visualDesign?: string;
  adaptSteps?: string[];
  platformTips?: string;
  headlineIdeas?: string[];
  collections?: string[];
  relatedGuides?: string[];
  popularSearches?: string[];
  // Ad slugs picked by hand; empty means similar ads are picked automatically.
  relatedAds?: string[];
};

// A curator credited on ad pages, with a public profile at /authors/<slug>.
export type Author = {
  id: number;
  slug: string;
  name: string;
  jobTitle?: string;
  credentials?: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  // How many ads they added; only on the author routes.
  adCount?: number;
};

export type AuthorInput = Omit<Author, "id" | "adCount" | "slug"> & { slug?: string };

// An enquiry from the landing page's "Talk to us" form, answered by email
// from Admin → Contact.
export type EnquiryStatus = "new" | "replied" | "closed";
export type ContactEnquiry = {
  id: number;
  name: string;
  email: string;
  company?: string;
  volume?: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  replyCount: number;
  // Only on a single enquiry.
  replies?: { id: number; subject: string; body: string; sentBy?: string; sentAt: string }[];
};

export type Role = "client" | "designer" | "editor" | "admin";

// The public price list, in USD.
// One price change from the pricing admin; old* are null on a plan's
// starting price.
export type PlanPriceChange = {
  id: number;
  plan: PlanId;
  volume: number;
  oldMonthly: number | null;
  oldYearly: number | null;
  monthly: number;
  yearly: number;
  oldCredits: number | null;
  credits: number;
  changedBy: string | null;
  changedAt: string;
};

export type PlanCatalog = {
  id: PlanId;
  name: string;
  trialCredits: number;
  maxBrands: number;
  maxSeats: number;
  turnaround: string | null;
  // volume is the tier's fixed id; credits is what it gives a month.
  tiers: { volume: number; monthly: number; yearly: number; credits: number }[];
}[];

export type CreditTotals = {
  received: number;
  used: number;
  expired: number;
  available: number;
};

export type CreditEntry = {
  id: number;
  reason: "trial" | "refill" | "upgrade" | "spent" | "refunded" | "expired" | "adjustment";
  delta: number;
  balance: number;
  note: string | null;
  createdAt: string;
};

// The subscription's next charge (e.g. when a trial ends).
export type UpcomingPayment = {
  date: string | null;
  amount: number;
  currency: string;
  description: string;
};

export type Payment = {
  id: string;
  number: string | null;
  date: string;
  description: string;
  reason: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  receiptUrl: string | null;
  pdfUrl: string | null;
  // Credits this payment granted (trial start, refill or upgrade).
  credits: number;
};

export type PlanId = "starter" | "pro" | "agency";
export type BillingCycle = "monthly" | "yearly";
export type AccountStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";

export type Entitlements = {
  save: boolean;
  // Downloads without the watermark (paid plans); others get a watermarked copy.
  cleanDownload: boolean;
  editableCopies: boolean;
  requests: boolean;
  videoRequests: boolean;
  brandKit: boolean;
};

// The customer account (company) a client belongs to. Plan, status and
// credits are shared by everyone on it.
export type Account = {
  id: number;
  name: string;
  plan: PlanId;
  planName: string;
  creditVolume: number;
  // Credits a month the account's tier gives (admins can change it).
  creditsPerMonth: number;
  billingCycle: BillingCycle;
  status: AccountStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  pastDueSince: string | null;
  graceEndsAt: string | null;
  credits: number;
  // The allowance this period's credits started from (trial or monthly).
  creditTotal: number;
  nextRefillAt: string | null;
  hasSubscription: boolean;
  // A trial owner who hasn't added a card yet: the trial starts at checkout.
  needsCard: boolean;
  // Cancelled during the free trial: ends at the trial's end, never charged.
  cancelledInTrial: boolean;
  maxBrands: number;
  maxSeats: number;
  turnaround: string | null;
  role: "owner" | "member";
  entitlements: Entitlements;
};

export type User = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  // Blog / brand page access: always both for admins; for editors, what an
  // admin granted; never for clients or designers.
  permissions: {
    blog: boolean;
    brandPages: boolean;
  };
  defaultLanguage: string;
  gridDensity: string;
  memberSince: string;
  emailPreferences: {
    onboarding: boolean;
    product: boolean;
    promotions: boolean;
    brand: boolean;
    newsletter: boolean;
  };
  // Null for Adplaylist staff.
  account: Account | null;
};

export type AdminUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  canManageBlog: boolean;
  canManageBrandPages: boolean;
  createdAt: string;
  // The customer account they belong to; null for staff.
  billing: {
    company: string;
    plan: PlanId;
    creditVolume: number;
    billingCycle: BillingCycle;
    status: Account["status"];
    currentPeriodEnd?: string | null;
    // Active, cancelled-but-running or past due: they've paid for this period.
    paid: boolean;
    owner: boolean;
  } | null;
};

export type Permission = keyof User["permissions"];

export type TransactionRange = 30 | 90 | 365;

// Admin → Transactions: Stripe invoices across every customer.
export type AdminPayments = {
  days: TransactionRange;
  currency: string;
  totals: { revenue: number; payments: number; average: number };
  series: { date: string; revenue: number; payments: number }[];
  payments: {
    id: string;
    number: string | null;
    date: string;
    company?: string;
    email?: string;
    description: string;
    reason: string | null;
    amount: number;
    amountPaid: number;
    currency: string;
    status: string | null;
    receiptUrl: string | null;
  }[];
};

// Admin → Transactions: every account's credit movements.
export type AdminCredits = {
  days: TransactionRange;
  totals: { granted: number; used: number; expired: number; entries: number };
  series: { date: string; granted: number; used: number; expired: number }[];
  entries: {
    id: number;
    date: string;
    company: string;
    email?: string;
    reason: string;
    delta: number;
    balance: number;
    note?: string;
  }[];
};

export type NewUserInput = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  canManageBlog: boolean;
  canManageBrandPages: boolean;
};

export type CreativeRequest = {
  id: number;
  title: string;
  type: string;
  sizeNeeded?: string;
  neededBy?: string;
  notes?: string;
  status: string;
  reason?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  ad?: Ad;
  // Whether a credit paid for it; a declined request's credit is refunded.
  creditCharged?: boolean;
  // Only sent to staff: who raised it, and their company account.
  requester?: {
    id: number;
    fullName: string;
    email: string;
    role: Role;
    accountRole?: string;
    company?: { name: string; plan: string; status: string };
  };
  createdAt: string;
};

// An entry under the bell: for this person, or for their role (e.g. a new
// request for staff, a delivered request for the customer who asked).
export type AppNotification = {
  id: number;
  // e.g. request.created, request.delivered, contact.created, payment.received
  type: string;
  title: string;
  body?: string;
  // The page it opens.
  link?: string;
  requestId?: number;
  actor?: { fullName: string; email: string };
  read: boolean;
  createdAt: string;
};

export type Feedback = {
  id: number;
  message: string;
  email?: string;
  screenshotUrl?: string;
  screenshotName?: string;
  pageUrl?: string;
  resolved: boolean;
  sender?: { fullName: string; email: string; role: Role };
  createdAt: string;
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  // Left out of list responses.
  bodyHtml?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  coverImageUrl?: string;
  bodyHtml?: string;
  published?: boolean;
};

export type Tag = {
  id: number;
  name: string;
};

export type BrandPage = {
  id: number;
  slug: string;
  brandName: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandPageInput = {
  brandName: string;
  slug?: string;
  heading?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  published?: boolean;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  // Set on a 402 when the plan doesn't allow the action, so callers can show
  // the upgrade prompt.
  upgrade: boolean;
  outOfCredits: boolean;
  // On a 409 for a taken ad slug: the ad that already has it.
  existingAd?: { id: string; title: string };
  constructor(
    status: number,
    message: string,
    flags: {
      upgrade?: boolean;
      outOfCredits?: boolean;
      existingAd?: { id: string; title: string };
    } = {}
  ) {
    super(message);
    this.status = status;
    this.upgrade = !!flags.upgrade;
    this.outOfCredits = !!flags.outOfCredits;
    this.existingAd = flags.existingAd;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "Request failed", body);
  }
  return body as T;
}

export const api = {
  getBilling: () => request<{ account: Account | null }>("/api/billing"),

  startCheckout: (plan: PlanId, volume: number, cycle: BillingCycle) =>
    request<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, volume, cycle }),
    }),

  completeCheckout: (sessionId: string) =>
    request<{ account: Account }>("/api/billing/checkout/return", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  getPlans: () => request<{ plans: PlanCatalog }>("/api/plans"),

  updatePlanPrices: (
    changes: { plan: PlanId; volume: number; monthly: number; yearly: number; credits: number }[]
  ) =>
    request<{ plans: PlanCatalog }>("/api/admin/plan-prices", {
      method: "PUT",
      body: JSON.stringify({ changes }),
    }),

  getPlanPriceHistory: () =>
    request<{ history: PlanPriceChange[] }>("/api/admin/plan-prices/history"),

  getCreditHistory: () =>
    request<{ totals: CreditTotals | null; entries: CreditEntry[] }>("/api/billing/credits"),

  getPayments: () =>
    request<{ upcoming: UpcomingPayment | null; payments: Payment[] }>("/api/billing/payments"),

  startPlanNow: () =>
    request<{ account: Account }>("/api/billing/start-now", { method: "POST" }),

  syncBilling: () =>
    request<{ account: Account | null }>("/api/billing/sync", { method: "POST" }),

  openBillingPortal: () =>
    request<{ url: string }>("/api/billing/portal", { method: "POST" }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (
    fullName: string,
    email: string,
    password: string,
    role: Exclude<Role, "admin">
  ) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, role }),
    }),

  loginWithGoogle: (credential: string) =>
    request<{ token: string; user: User }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),

  me: () => request<{ user: User }>("/api/auth/me"),

  getAds: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<{ ads: Ad[] }>(`/api/ads${qs}`);
  },

  getAd: (id: string) => request<{ ad: Ad }>(`/api/ads/${id}`),

  // The creative's download link: clean for staff and paid plans,
  // watermarked otherwise.
  getAdDownload: (id: string) =>
    request<{ url: string; watermarked: boolean }>(`/api/ads/${id}/download`),

  createAd: (data: Partial<Ad>) =>
    request<{ ad: Ad }>("/api/ads", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAd: (id: string, data: Partial<Ad>) =>
    request<{ ad: Ad }>(`/api/ads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  setAdHomeSection: (
    id: string,
    data: { featured?: boolean; heroPlatforms?: string[] }
  ) =>
    request<{ ad: Ad }>(`/api/ads/${id}/home-section`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAd: (id: string) =>
    request<void>(`/api/ads/${id}`, { method: "DELETE" }),

  uploadFile: async (
    file: File,
    dims?: { width: number; height: number }
  ) => {
    // The API issues a short-lived signed URL and the browser uploads
    // straight to Supabase Storage with it — the file bytes never pass
    // through our own server, which sidesteps a proxy in front of the API
    // (inherited from its original PHP hosting) that corrupts
    // multipart/form-data request bodies.
    const { signedUrl, url } = await request<{
      path: string;
      token: string;
      signedUrl: string;
      url: string;
    }>("/api/uploads/sign", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) {
      throw new ApiError(putRes.status, "Upload failed");
    }

    return { url, width: dims?.width, height: dims?.height };
  },

  getSaved: () => request<{ ads: Ad[] }>("/api/saved"),

  saveAd: (id: string) =>
    request<{ saved: boolean }>(`/api/saved/${id}`, { method: "POST" }),

  unsaveAd: (id: string) =>
    request<{ saved: boolean }>(`/api/saved/${id}`, { method: "DELETE" }),

  getRequests: () => request<{ requests: CreativeRequest[] }>("/api/requests"),

  // "Request Canva Edit" on an ad with no Canva copy; costs a client 1 credit.
  // alreadyRequested: an open request for it existed, so nothing was charged.
  requestCanvaEdit: (adId: string) =>
    request<{ request: CreativeRequest; alreadyRequested: boolean }>("/api/requests/canva", {
      method: "POST",
      body: JSON.stringify({ adId }),
    }),

  createRequest: (data: {
    title: string;
    sizeNeeded?: string;
    neededBy?: string;
    notes?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) =>
    request<{ request: CreativeRequest }>("/api/requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAdminPayments: (days: TransactionRange) =>
    request<AdminPayments>(`/api/admin/transactions/payments?days=${days}`),

  getAdminCredits: (days: TransactionRange) =>
    request<AdminCredits>(`/api/admin/transactions/credits?days=${days}`),

  getNotifications: () =>
    request<{ notifications: AppNotification[]; unread: number }>("/api/notifications"),

  markNotificationRead: (id: number) =>
    request<{ ok: true }>(`/api/notifications/${id}/read`, { method: "POST" }),

  markAllNotificationsRead: () =>
    request<{ ok: true }>("/api/notifications/read-all", { method: "POST" }),

  getRequestsQueue: () =>
    request<{ requests: CreativeRequest[] }>("/api/requests/queue"),

  deliverRequest: (id: number, adId: string) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/deliver`, {
      method: "POST",
      body: JSON.stringify({ adId }),
    }),

  declineRequest: (id: number, reason: string) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Public: the landing page's "Talk to us" form for custom volumes.
  sendContact: (data: {
    name: string;
    email: string;
    company?: string;
    volume?: string;
    message: string;
    website?: string;
  }) =>
    request<{ ok: true }>("/api/contact", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  sendFeedback: (data: {
    message: string;
    email?: string;
    screenshotUrl?: string;
    screenshotName?: string;
    pageUrl?: string;
  }) =>
    request<{ feedback: Feedback }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFeedback: () => request<{ feedback: Feedback[] }>("/api/feedback"),

  setFeedbackResolved: (id: number, resolved: boolean) =>
    request<{ feedback: Feedback }>(`/api/feedback/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    }),

  deleteFeedback: (id: number) =>
    request<void>(`/api/feedback/${id}`, { method: "DELETE" }),

  getProfile: () => request<{ user: User }>("/api/profile"),

  updateProfile: (data: Partial<User> & { fullName?: string }) =>
    request<{ user: User }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),

  createUser: (data: NewUserInput) =>
    request<{ user: AdminUser }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateUser: (
    id: number,
    data: {
      fullName: string;
      email: string;
      canManageBlog: boolean;
      canManageBrandPages: boolean;
    }
  ) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateUserRole: (id: number, role: Role) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  deleteUser: (id: number) =>
    request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),

  getPublicBrandPage: (slug: string) =>
    request<{ page: BrandPage }>(
      `/api/brand-pages/public/${encodeURIComponent(slug)}`
    ),

  getTags: () => request<{ tags: Tag[] }>("/api/tags"),

  createTag: (name: string) =>
    request<{ tag: Tag }>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  renameTag: (id: number, name: string) =>
    request<{ tag: Tag }>(`/api/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  deleteTag: (id: number) =>
    request<void>(`/api/tags/${id}`, { method: "DELETE" }),

  getBrandPages: () => request<{ pages: BrandPage[] }>("/api/brand-pages"),

  getBrandPage: (id: number) =>
    request<{ page: BrandPage }>(`/api/brand-pages/${id}`),

  createBrandPage: (data: BrandPageInput) =>
    request<{ page: BrandPage }>("/api/brand-pages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBrandPage: (id: number, data: BrandPageInput) =>
    request<{ page: BrandPage }>(`/api/brand-pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteBrandPage: (id: number) =>
    request<void>(`/api/brand-pages/${id}`, { method: "DELETE" }),

  getPublicBlogPosts: () =>
    request<{ posts: BlogPost[] }>("/api/blog-posts/public"),

  getPublicBlogPost: (slug: string) =>
    request<{ post: BlogPost }>(
      `/api/blog-posts/public/${encodeURIComponent(slug)}`
    ),

  getBlogPosts: () => request<{ posts: BlogPost[] }>("/api/blog-posts"),

  getBlogPost: (id: number) =>
    request<{ post: BlogPost }>(`/api/blog-posts/${id}`),

  createBlogPost: (data: BlogPostInput) =>
    request<{ post: BlogPost }>("/api/blog-posts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBlogPost: (id: number, data: BlogPostInput) =>
    request<{ post: BlogPost }>(`/api/blog-posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteBlogPost: (id: number) =>
    request<void>(`/api/blog-posts/${id}`, { method: "DELETE" }),

  getEnquiries: () =>
    request<{ enquiries: ContactEnquiry[]; mailConfigured: boolean }>("/api/contact"),

  getEnquiry: (id: number) => request<{ enquiry: ContactEnquiry }>(`/api/contact/${id}`),

  replyToEnquiry: (id: number, data: { subject: string; body: string }) =>
    request<{ enquiry: ContactEnquiry }>(`/api/contact/${id}/reply`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  setEnquiryStatus: (id: number, status: EnquiryStatus) =>
    request<{ ok: true }>(`/api/contact/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteEnquiry: (id: number) => request<void>(`/api/contact/${id}`, { method: "DELETE" }),

  getAuthors: () => request<{ authors: Author[] }>("/api/authors"),

  getAuthor: (slug: string) =>
    request<{ author: Author; ads: Ad[] }>(
      `/api/authors/${encodeURIComponent(slug)}`
    ),

  createAuthor: (data: AuthorInput) =>
    request<{ author: Author }>("/api/authors", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAuthor: (id: number, data: AuthorInput) =>
    request<{ author: Author }>(`/api/authors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAuthor: (id: number) =>
    request<void>(`/api/authors/${id}`, { method: "DELETE" }),
};

export { ApiError };
