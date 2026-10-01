"use client";

import Link from "@/components/Link";
import Modal from "@/components/Modal";

export type SignUpReason = "save" | "editableCopies" | "requests";

const WHAT: Record<SignUpReason, string> = {
  save: "save creatives to your own collection",
  editableCopies: "open editable copies",
  requests: "request new sizes and custom ads",
};

// For visitors on the public library and ad pages: everything can be
// browsed, but acting on an ad needs an account.
export default function SignUpPrompt({
  reason,
  onClose,
}: {
  reason: SignUpReason | null;
  onClose: () => void;
}) {
  if (!reason) return null;
  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-extrabold text-ink">Create a free account</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Sign up to {WHAT[reason]}. Every plan starts with a 7-day free trial.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <Link href="/login" className="border border-border px-4 py-2 text-sm font-bold text-ink">
          Sign in
        </Link>
        <Link href="/signup" className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground">
          Sign up free
        </Link>
      </div>
    </Modal>
  );
}
