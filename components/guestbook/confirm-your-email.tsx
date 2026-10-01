"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

import { ConfirmEmail } from "@/components/guestbook/confirm-email";

/**
 * On a Member's guestbook page while their email address is unconfirmed
 * (Members who signed up before verification was turned on, #82): what it is
 * for, and the code to confirm it. Once confirmed the page reloads without it.
 */
export function ConfirmYourEmail({ email, required }: { email: string; required: boolean }) {
  const router = useRouter();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="bg-card rounded-[4px] border-l-4 border-[var(--accent)] px-5 py-5 shadow-[0_1px_2px_rgba(60,40,20,.12)]">
      <h2 className="font-hand text-[30px] leading-none font-bold" id={titleId}>
        Confirm your email address
      </h2>
      <p className="text-soft mt-2 mb-4 text-[16px] leading-relaxed">
        {required ? "Swiftter needs to know " : "It shows "}
        <strong className="text-ink break-all">{email}</strong> is yours
        {required ? " before you pass another note: " : ": "}
        we&apos;ll email you a code to type here.
      </p>
      <ConfirmEmail email={email} moment="account" onConfirmed={() => router.refresh()} />
    </section>
  );
}
