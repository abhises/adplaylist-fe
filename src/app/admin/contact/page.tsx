"use client";

import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import { api, ApiError, type ContactEnquiry, type EnquiryStatus } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const STATUS_STYLE: Record<EnquiryStatus, string> = {
  new: "bg-brand text-brand-foreground",
  replied: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  closed: "bg-ink/10 text-ink-muted",
};

const FILTERS: { value: EnquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A first draft for a reply, so the admin starts from a greeting and
// sign-off rather than a blank box.
function draftBody(enquiry: ContactEnquiry, adminName: string) {
  const first = enquiry.name.split(/\s+/)[0];
  return `Hi ${first},\n\nThanks for getting in touch about a custom plan${
    enquiry.volume ? ` for ${enquiry.volume} ads a month` : ""
  }.\n\n\n\nBest regards,\n${adminName}\nAdplaylist`;
}

// Enquiries from the landing page's "Talk to us" form (custom volume,
// custom price). Replies are emailed to the sender from info@adplaylist.com,
// so their answer arrives in that mailbox; each sent reply is kept here.
export default function AdminContactPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const toast = useToast();
  const [enquiries, setEnquiries] = useState<ContactEnquiry[] | null>(null);
  const [mailConfigured, setMailConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EnquiryStatus | "all">("all");

  const [selected, setSelected] = useState<ContactEnquiry | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactEnquiry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const shown = (enquiries ?? []).filter((e) => filter === "all" || e.status === filter);
  const pagination = usePagination(shown.length, "adplaylist_contact_page_size");

  async function load() {
    try {
      const res = await api.getEnquiries();
      setEnquiries(res.enquiries);
      setMailConfigured(res.mailConfigured);
    } catch {
      setError("Couldn't load enquiries.");
      setEnquiries([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(load);
  }, [user]);

  async function open(id: number) {
    setReplyError(null);
    try {
      const { enquiry } = await api.getEnquiry(id);
      setSelected(enquiry);
      setSubject(`Re: Your Adplaylist enquiry${enquiry.company ? ` – ${enquiry.company}` : ""}`);
      setBody(draftBody(enquiry, user?.fullName ?? "The Adplaylist team"));
    } catch {
      setError("Couldn't open that enquiry.");
    }
  }

  // Keeps the list row in step with the open enquiry after a change.
  function syncRow(updated: Partial<ContactEnquiry> & { id: number }) {
    setEnquiries((list) => list?.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)) ?? list);
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    setReplyError(null);
    try {
      const { enquiry } = await api.replyToEnquiry(selected.id, { subject, body });
      setSelected(enquiry);
      syncRow({ id: enquiry.id, status: enquiry.status, replyCount: enquiry.replyCount });
      setBody(draftBody(enquiry, user?.fullName ?? "The Adplaylist team"));
      toast.success(`Reply sent to ${enquiry.email}.`);
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Couldn't send the reply.");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: EnquiryStatus) {
    if (!selected) return;
    try {
      await api.setEnquiryStatus(selected.id, status);
      setSelected({ ...selected, status });
      syncRow({ id: selected.id, status });
      toast.success(status === "closed" ? "Enquiry closed." : "Enquiry reopened.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update the enquiry.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEnquiry(deleteTarget.id);
      setEnquiries((list) => list?.filter((e) => e.id !== deleteTarget.id) ?? list);
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast.success("Enquiry deleted.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the enquiry.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!ready || !user) return null;

  const newCount = (enquiries ?? []).filter((e) => e.status === "new").length;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">Admin</p>
        <h1 className="text-3xl font-extrabold text-ink">Contact</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Enquiries from the landing page&apos;s &ldquo;Custom volume, custom price&rdquo;
          form. Replies are emailed from info@adplaylist.com, so the client&apos;s answer
          arrives in that mailbox.
        </p>

        {!mailConfigured && (
          <p className="mt-4 max-w-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-ink">
            Email isn&apos;t set up on the server yet, so replies can&apos;t be sent. Add the
            SMTP settings for info@adplaylist.com to the API&apos;s environment.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-brand">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`border px-3 py-1.5 text-sm ${
                filter === f.value
                  ? "border-ink bg-ink text-surface"
                  : "border-border text-ink hover:border-ink/60"
              }`}
            >
              {f.label}
              {f.value === "new" && newCount > 0 && ` (${newCount})`}
            </button>
          ))}
        </div>

        {enquiries === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Loading enquiries…
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Inbox */}
            <div className="border-t border-ink/15">
              {shown.length === 0 ? (
                <p className="py-6 text-sm text-ink-muted">No enquiries here.</p>
              ) : (
                <>
                  <ul>
                    {shown.slice(pagination.start, pagination.end).map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => open(e.id)}
                          className={`block w-full border-b border-ink/10 px-3 py-3 text-left hover:bg-surface-2 ${
                            selected?.id === e.id ? "bg-surface-2" : ""
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className={`truncate text-sm text-ink ${e.status === "new" ? "font-bold" : ""}`}>
                              {e.name}
                              {e.company && <span className="font-normal text-ink-muted"> · {e.company}</span>}
                            </span>
                            <span className={`shrink-0 px-2 py-0.5 text-[11px] font-bold uppercase ${STATUS_STYLE[e.status]}`}>
                              {e.status}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-sm text-ink-muted">{e.message}</span>
                          <span className="mt-1 block text-xs text-ink-muted">
                            {when(e.createdAt)}
                            {e.volume && ` · ${e.volume} ads/mo`}
                            {e.replyCount > 0 && ` · ${e.replyCount} repl${e.replyCount === 1 ? "y" : "ies"}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Pagination {...pagination.props} />
                </>
              )}
            </div>

            {/* Conversation */}
            <div className="border border-ink/15 p-5">
              {!selected ? (
                <p className="text-sm text-ink-muted">Pick an enquiry to read and reply.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-extrabold text-ink">{selected.name}</h2>
                      <p className="text-sm text-ink-muted">
                        <a suppressHydrationWarning href={`mailto:${selected.email}`} className="text-brand">
                          {selected.email}
                        </a>
                        {selected.company && ` · ${selected.company}`}
                        {selected.volume && ` · ${selected.volume} ads/month`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selected.status === "closed" ? (
                        <button
                          type="button"
                          onClick={() => changeStatus(selected.replyCount ? "replied" : "new")}
                          className="border border-border px-3 py-1.5 text-sm text-ink"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeStatus("closed")}
                          className="border border-border px-3 py-1.5 text-sm text-ink"
                        >
                          Mark closed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(selected)}
                        className="px-2 py-1.5 text-sm text-brand"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 border-l-2 border-ink/20 pl-4">
                    <p className="text-xs text-ink-muted">Enquiry · {when(selected.createdAt)}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{selected.message}</p>
                  </div>

                  {selected.replies?.map((r) => (
                    <div key={r.id} className="mt-4 border-l-2 border-brand pl-4">
                      <p className="text-xs text-ink-muted">
                        Reply by {r.sentBy ?? "an admin"} · {when(r.sentAt)} · &ldquo;{r.subject}&rdquo;
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{r.body}</p>
                    </div>
                  ))}

                  <form onSubmit={handleReply} className="mt-6 space-y-3 border-t border-ink/15 pt-5">
                    <p className="text-sm font-bold text-ink">
                      Reply to {selected.email}
                    </p>
                    <label className="block">
                      <span className="mb-1 block text-xs text-ink/70">Subject</span>
                      <input
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-ink/70">Message</span>
                      <textarea
                        required
                        rows={10}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <p className="text-xs text-ink-muted">
                      Sent from info@adplaylist.com with their enquiry quoted below; a copy
                      goes to that inbox too.
                    </p>
                    {replyError && <p className="text-sm text-brand">{replyError}</p>}
                    <button
                      type="submit"
                      disabled={sending || !mailConfigured}
                      className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send reply"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete enquiry?"
        message={
          deleteTarget && (
            <>
              The enquiry from <strong>{deleteTarget.name}</strong> and the replies sent to it
              will be removed from here. Emails already sent aren&apos;t affected.
            </>
          )
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
