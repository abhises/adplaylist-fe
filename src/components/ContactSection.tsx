"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";

const mono = "font-mono text-[12px] tracking-[0.08em]";
const h2 = "text-[clamp(36px,4.5vw,56px)] leading-none font-extrabold tracking-[-0.03em]";
const field =
  "w-full border border-[#e0ddd9] bg-white px-3 py-[11px] text-[15px] text-[#161514] outline-none focus:border-[#161514]";
const label = "text-[13px] font-semibold text-[#55524e]";

const VOLUMES = ["150–250", "250–500", "500–1,000", "1,000+", "Not sure yet"];

// #contact on the landing page, where the pricing section's "Custom volume,
// custom price" box points. Enquiries reach admins under Admin → Feedback.
export default function ContactSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [volume, setVolume] = useState("");
  const [message, setMessage] = useState("");
  // Hidden from people; a bot that fills it in is ignored by the API.
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.sendContact({
        // Signed-in visitors don't retype what we already know.
        name: name.trim() || user?.fullName || "",
        email: email.trim() || user?.email || "",
        company: company.trim() || undefined,
        volume: volume || undefined,
        message: message.trim(),
        website,
      });
      setSent(true);
      toast.success("Thanks! We'll get back to you within one working day.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-[72px] border-t border-[#dcd9d5]">
      <div
        className="mx-auto grid max-w-[1320px] items-start gap-16 px-[clamp(20px,4vw,32px)] py-[clamp(64px,10vw,110px)]"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))" }}
      >
        <div>
          <div className={`${mono} text-[#EC3016]`}>ENTERPRISE</div>
          <h2 className={`${h2} mt-[14px] text-balance`}>Custom volume, custom price.</h2>
          <p className="mt-6 max-w-[500px] text-[18px] leading-[1.55] text-pretty text-[#55524e]">
            Need more than 150 ads a month, several brands under one account, or a setup
            we don&rsquo;t list? Tell us what you need and we&rsquo;ll put together a plan
            and price for you.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[16px] text-[#161514]">
            {[
              "Any monthly volume of custom ads",
              "More brands and team seats",
              "A dedicated creative lead",
              "Invoiced billing",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="font-bold text-[#1f8a4c]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {sent ? (
          <div className="flex flex-col gap-3 border border-[#e0ddd9] bg-white p-[clamp(20px,5vw,32px)]">
            <div className="text-[20px] font-bold">Thanks, we&rsquo;ve got it.</div>
            <p className="text-[16px] leading-[1.55] text-[#55524e]">
              Someone from the team will reply to {email.trim() || user?.email} within one
              working day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 border border-[#e0ddd9] bg-white p-[clamp(20px,5vw,32px)]"
          >
            <div className="text-[20px] font-bold">Talk to us</div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={label}>Name</span>
                <input
                  required={!user}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={user?.fullName ?? "Your name"}
                  autoComplete="name"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Work email</span>
                <input
                  type="email"
                  required={!user}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user?.email ?? "you@company.com"}
                  autoComplete="email"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Company</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={label}>Custom ads per month</span>
                <select value={volume} onChange={(e) => setVolume(e.target.value)} className={field}>
                  <option value="">Choose…</option>
                  {VOLUMES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className={label}>What do you need?</span>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Brands, markets, formats, how often you need new ads…"
                className={field}
              />
            </label>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />
            {error && <p className="text-[14px] text-[#EC3016]">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="bg-[#161514] px-5 py-[15px] text-[16px] font-bold text-white hover:bg-[#EC3016] disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
