"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { api, type User } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/AuthProvider";

const EMAIL_PREFS: {
  id: keyof User["emailPreferences"];
  title: string;
  desc: string;
}[] = [
  {
    id: "onboarding",
    title: "Onboarding & Tips",
    desc: "Getting started guides, feature tips, and weekly recaps.",
  },
  {
    id: "product",
    title: "Product Updates",
    desc: "New features, improvements, and changelog.",
  },
  {
    id: "promotions",
    title: "Promotions",
    desc: "Discounts, special offers, and limited-time deals.",
  },
  {
    id: "brand",
    title: "Brand updates",
    desc: "One mail a day when a brand you follow launches or stops ads.",
  },
  {
    id: "newsletter",
    title: "Newsletter",
    desc: "Editorial roundups: ad news, marketing tactics, and tips — written, not AI-generated.",
  },
];

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 transition-colors ${
        on ? "bg-brand" : "bg-surface-2 border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 bg-white transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formFromUser(user: User) {
  return {
    fullName: user.fullName,
    defaultLanguage: user.defaultLanguage,
    gridDensity: user.gridDensity,
    emailPreferences: { ...user.emailPreferences },
  };
}

export default function ProfilePage() {
  const { user: authUser, ready } = useRequireAuth();
  const { refresh } = useAuth();
  const [form, setForm] = useState<ReturnType<typeof formFromUser> | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    Promise.resolve().then(() => setForm(formFromUser(authUser)));
  }, [authUser]);

  if (!ready || !authUser || !form) return null;

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await api.updateProfile(form);
      await refresh();
      setSavedMessage("Changes saved.");
    } catch {
      setSavedMessage("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (authUser) setForm(formFromUser(authUser));
    setSavedMessage(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="flex items-center gap-4 border-b border-ink/15 px-10 py-8">
          <span className="flex h-16 w-16 items-center justify-center bg-ink text-xl font-bold text-surface">
            {initials(authUser.fullName)}
          </span>
          <div>
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Account
            </p>
            <h1 className="text-2xl font-extrabold text-ink">
              {authUser.fullName}
            </h1>
          </div>
        </div>

        <div className="px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            Settings
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Manage your account settings and preferences.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="border border-ink/15 p-6">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Profile
              </p>
              <div className="mt-4">
                <label className="mb-[5px] block text-xs text-ink/70">
                  Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={authUser.email}
                  className="w-full border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none"
                />
                <p className="mt-2 text-xs text-ink-muted">
                  Contact support to change your email address.
                </p>
              </div>
              <div className="mt-6 border-t border-ink/10 pt-4">
                <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                  Member since
                </p>
                <p className="mt-1 text-sm text-ink">
                  {formatDate(authUser.memberSince)}
                </p>
              </div>
            </div>

            <div className="border border-ink/15 p-6">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Preferences
              </p>
              <div className="mt-4">
                <label className="mb-[5px] block text-xs text-ink/70">
                  Full name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                />
              </div>
              <div className="mt-4">
                <label className="mb-[5px] block text-xs text-ink/70">
                  Default language
                </label>
                <select
                  value={form.defaultLanguage}
                  onChange={(e) =>
                    setForm({ ...form, defaultLanguage: e.target.value })
                  }
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
                >
                  <option>English (EN)</option>
                  <option>German (GE)</option>
                  <option>French (FR)</option>
                  <option>Dutch (NL)</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="mb-[5px] block text-xs text-ink/70">
                  Grid density
                </label>
                <select
                  value={form.gridDensity}
                  onChange={(e) =>
                    setForm({ ...form, gridDensity: e.target.value })
                  }
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
                >
                  <option>Comfortable</option>
                  <option>Compact</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Email preferences
            </p>
            <div className="mt-2 divide-y divide-ink/10 border-t border-b border-ink/15">
              {EMAIL_PREFS.map((pref) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between gap-6 py-4"
                >
                  <div>
                    <p className="text-sm font-bold text-ink">{pref.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">{pref.desc}</p>
                  </div>
                  <Toggle
                    on={form.emailPreferences[pref.id]}
                    onToggle={() =>
                      setForm({
                        ...form,
                        emailPreferences: {
                          ...form.emailPreferences,
                          [pref.id]: !form.emailPreferences[pref.id],
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border border-brand p-6">
            <p className="text-xs font-medium tracking-[1px] text-brand uppercase">
              Danger zone
            </p>
            <div className="mt-4 flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-bold text-ink">Delete account</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <button className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground">
                Delete
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t-2 border-ink/15 pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={handleDiscard}
              className="border border-border px-5 py-2.5 text-sm font-bold text-ink"
            >
              Discard
            </button>
            {savedMessage && (
              <span className="text-sm text-ink-muted">{savedMessage}</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
