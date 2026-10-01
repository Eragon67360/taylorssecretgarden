import { notFound } from "next/navigation";

import { renderAuthEmail } from "@/lib/emails/auth-emails";
import { EMAIL_SAMPLES } from "@/lib/emails/samples";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Account emails",
  description: "Every account email the site sends, with sample data, for development.",
  path: "/styleguide/emails",
  noindex: true,
});

/**
 * The account emails (lib/emails), each rendered with sample data, as HTML
 * and as plain text. Like the styleguide, production serves it only when
 * ENABLE_STYLEGUIDE=1. Each email is shown in a frame, as a mail app would,
 * with its image loaded from this server (the emails themselves load it from
 * production).
 */
export default function EmailStyleguide() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-12 pb-14 sm:px-8">
      <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">Development only · not in production</p>
      <h1 className="font-serif mt-2 text-[clamp(2.6rem,7vw,4.8rem)] leading-none font-semibold tracking-[-0.02em]">Account emails</h1>
      <p className="text-soft mt-4 max-w-[44rem] text-[17px] leading-relaxed">
        What Neon Auth&apos;s webhook sends through Resend (app/api/auth-email), with sample data. The site uses the first two today; the others are ready if
        Neon Auth ever sends them. <code>npm run email:preview</code> writes the same files to <code>.email-preview/</code>. Switch the system to dark mode to
        see the dark version mail apps that support it show.
      </p>

      <ul className="mt-10 grid gap-14">
        {EMAIL_SAMPLES.map(({ slug, title, inUse, email }) => {
          const { subject, preheader, html, text } = renderAuthEmail(email, { assetsUrl: "" });

          return (
            <li key={slug}>
              <section aria-labelledby={`email-${slug}`}>
                <h2 className="font-serif text-[32px] font-semibold" id={`email-${slug}`}>
                  {title}
                </h2>
                <p className="text-soft mt-1 text-[15px]">
                  {inUse ? "Sent today." : "Not sent by the site today."} Subject: <strong className="text-ink">{subject}</strong> · Preheader: {preheader}
                </p>
                <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
                  <iframe className="border-line h-[760px] w-full border bg-white" srcDoc={html} title={`${title}, as HTML`} />
                  <pre className="border-line bg-card overflow-x-auto border p-4 text-[13px] leading-relaxed whitespace-pre-wrap">{text}</pre>
                </div>
              </section>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
