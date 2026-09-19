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

export type User = {
  id: number;
  email: string;
  fullName: string;
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
  createdAt: string;
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

  register: (fullName: string, email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
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

  getProfile: () => request<{ user: User }>("/api/profile"),

  updateProfile: (data: Partial<User> & { fullName?: string }) =>
    request<{ user: User }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export { ApiError };
