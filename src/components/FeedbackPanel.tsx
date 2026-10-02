"use client";

import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/Spinner";
import { api, ApiError, type User } from "@/lib/api";
import { useToast } from "@/lib/ToastProvider";

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_MIME = /^image\/(png|jpe?g|webp|gif)$/;

const labelClass = "text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase";
const inputClass =
  "border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/70";

// The "Feedback" tab pinned to the right edge of the library, and the panel
// it slides out. What's sent lands in the admin's /admin/feedback inbox.
export default function FeedbackPanel({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user.email);
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the preview's blob URL once it's replaced or the panel unmounts.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const cantSend = !message.trim() || sending;

  function resetForm() {
    setSent(false);
    setMessage("");
    setEmail(user.email);
    setFile(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    if (sent) resetForm();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function handleFile(picked: File | undefined) {
    if (!picked) return;
    if (!SCREENSHOT_MIME.test(picked.type)) {
      setError("Screenshots must be PNG, JPG, WEBP or GIF.");
      return;
    }
    if (picked.size > MAX_SCREENSHOT_BYTES) {
      setError("That screenshot is over the 10 MB limit.");
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function submit() {
    if (cantSend) return;
    setSending(true);
    setError(null);
    try {
      const screenshot = file ? await api.uploadFile(file) : null;
      await api.sendFeedback({
        message: message.trim(),
        email: email.trim() || undefined,
        screenshotUrl: screenshot?.url,
        screenshotName: file?.name,
        pageUrl: window.location.href,
      });
      setSent(true);
      toast.success("Thanks! Your feedback was sent.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't send your feedback."
      );
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-1/2 right-0 z-20 -translate-y-1/2 rotate-180 bg-ink pt-10 pr-2 pb-10 pl-2 text-sm leading-none font-semibold tracking-[2px] text-surface [writing-mode:vertical-rl] hover:bg-brand hover:text-brand-foreground"
      >
        FEEDBACK
      </button>
    );
  }

  const replyTo = email.trim();

  return (
    <>
      <div onClick={close} className="fixed inset-0 z-30 bg-ink/25" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        className="fixed top-0 right-0 bottom-0 z-[31] flex w-[400px] max-w-[100vw] flex-col bg-surface shadow-[-8px_0_30px_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-center justify-between border-b border-ink/15 px-7 py-5">
          <p className={labelClass}>Send feedback</p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-3 h-11 w-11 text-2xl text-ink-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        {!sent ? (
          <>
            <div className="flex flex-1 flex-col gap-6 overflow-auto p-7">
              <h2 className="text-2xl leading-tight font-extrabold text-ink">
                How can we make Adplaylist better?
              </h2>

              <label className="flex flex-col gap-2">
                <span className={labelClass}>Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  autoFocus
                  placeholder="Something broken, missing, or confusing?"
                  className={`resize-y ${inputClass}`}
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className={labelClass}>
                  Screenshot{" "}
                  <span className="tracking-normal normal-case">(optional)</span>
                </span>
                <label className="flex cursor-pointer items-center justify-between gap-3 border border-dashed border-border p-4 text-sm hover:border-ink">
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Screenshot preview"
                      className="h-12 w-12 shrink-0 border border-border object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-ink-muted">
                    {file?.name ?? "Attach an image"}
                  </span>
                  {file ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="font-semibold text-ink underline"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="font-semibold text-ink underline">Browse</span>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className={labelClass}>
                  Email{" "}
                  <span className="tracking-normal normal-case">
                    (if you&rsquo;d like a reply)
                  </span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className={inputClass}
                />
              </label>

              {error && (
                <p className="text-sm text-brand" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-ink/15 px-7 py-5">
              <button
                type="button"
                onClick={close}
                className="border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={cantSend}
                className="flex items-center gap-2 bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-50"
              >
                {sending && <Spinner />}
                Send feedback
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col gap-4 p-7">
            <div className="grid h-11 w-11 place-items-center bg-brand text-xl font-bold text-brand-foreground">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold text-ink">
              Thanks, feedback received.
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              {replyTo
                ? `We'll reply to ${replyTo} if we have questions.`
                : "Your note goes straight to the team."}
            </p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="bg-ink px-5 py-2.5 text-sm font-bold text-surface"
              >
                Close
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
              >
                Send another
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
