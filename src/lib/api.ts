const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
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
  mediaType: "image" | "video";
  swatch: string;
  light?: boolean;
  category: string;
  market: string;
  language: string;
  photo?: string;
  platforms: string[];
  editable: boolean;
  canvaUrl?: string;
  dominantColor?: string;
  videoLength?: string;
  createdAt: string;
};

export type Role = "client" | "designer" | "admin";

export type User = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
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
};

export type AdminUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
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
  requester?: { fullName: string; email: string };
  createdAt: string;
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
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
    throw new ApiError(res.status, body.error ?? "Request failed");
  }
  return body as T;
}

export const api = {
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

  getProfile: () => request<{ user: User }>("/api/profile"),

  updateProfile: (data: Partial<User> & { fullName?: string }) =>
    request<{ user: User }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),

  updateUser: (id: number, data: { fullName: string; email: string }) =>
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
};

export { ApiError };
