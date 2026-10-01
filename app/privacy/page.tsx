import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ContactEmail, LegalPage, Section } from "@/components/legal-page";
import { LIMITS, MODERATION_RETRY } from "@/lib/swiftter";
import { pageMetadata } from "@/lib/metadata";
import { RETENTION_DAYS } from "@/service/swiftter";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description: "What Taylor's Secret Garden keeps about its visitors and Members, why, with whom it is shared, for how long, and how to download or delete it.",
  path: "/privacy",
});

/** A torn-up note's empty row stays this long at most when nothing refers to it: the write limits' window. */
const TOMBSTONE_MINUTES = Math.max(LIMITS.post.minutes, LIMITS.reply.minutes);

const CONTENTS = [
  { id: "who", title: "Who keeps your data" },
  { id: "what", title: "What is kept" },
  { id: "why", title: "Why, and on what basis" },
  { id: "who-else", title: "Who else handles it" },
  { id: "how-long", title: "How long it is kept" },
  { id: "rights", title: "Your rights" },
  { id: "cookies", title: "Cookies" },
  { id: "changes", title: "Changes" },
];

/**
 * The privacy policy (GDPR arts. 12–14): in English, the site's language.
 * Every period and every processor here comes from the code or the hosting
 * set-up: service/swiftter.ts (purgeExpired, deleteMemberAccount), the
 * auth cookies (app/api/auth), next.config.ts's media hosts. Change them
 * together.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      contents={CONTENTS}
      intro="What this site keeps about you, why, who else handles it, for how long, and how to get it back or have it deleted. In plain words: very little, and only what Swiftter needs."
      kicker="the small print · privacy"
      title="Privacy policy"
      updated="1 October 2026"
    >
      <Section id="who" title="Who keeps your data">
        <p>
          Taylor&apos;s Secret Garden is a personal, non-commercial fan site published by <strong>{siteConfig.publisher}</strong>, a private individual living
          in France. He is the data controller for everything below. Write to <ContactEmail /> about anything on this page. The{" "}
          <Link href="/legal">legal notice</Link> says who hosts the site.
        </p>
      </Section>

      <Section id="what" title="What is kept">
        <h3>If you only read the site</h3>
        <p>
          No account, no advertising, no cookies. Like every website, the host sees the technical details of each request (your IP address, your browser, the
          page asked for, the time) and keeps them in its logs for a short time, to run the site and keep it secure.
        </p>
        <p>
          The site also measures its audience with <strong>Vercel Web Analytics</strong>, on the live site only. It sets no cookie and stores nothing in your
          browser. It counts page views (the page&apos;s address, cleaned of sign-in codes and return addresses, the page you came from, your browser, operating
          system and device type, and your approximate location: country, region, city) and five events: &ldquo;Sign up&rdquo;, &ldquo;Sign in&rdquo;,
          &ldquo;Google sign-in started&rdquo;, &ldquo;Note passed&rdquo; (with whether it was a reply) and &ldquo;Preview played&rdquo;. No event carries your
          name, email address, account or the text of a note. According to Vercel, visitors are told apart only by a hash made from the request, without
          cookies, and a visit is discarded after 24 hours; the publisher sees aggregate figures only.
        </p>
        <h3>If you sign the guestbook (become a Member)</h3>
        <ul>
          <li>
            <strong>Your account:</strong> the name you give, your email address and your password, which is never stored as such, only as a one-way hash. If
            you sign in with Google instead, Google tells the site your name, email address, profile picture and Google account identifier, and the sign-in
            tokens it issues are kept with your account.
          </li>
          <li>
            <strong>Your sessions:</strong> when you sign in, a session is recorded with the IP address and browser it was opened from, until you sign out or it
            expires.
          </li>
          <li>
            <strong>What you write on Swiftter:</strong> your notes and replies, your reshares, and when each was written, published, undone or torn up.
          </li>
          <li>
            <strong>Moderation decisions:</strong> for each note, whether the automated check allowed or refused it, the rule it broke if any, the check&apos;s
            one-sentence reason, which model gave it and how long it took. See the <Link href="/terms">terms</Link> for how the check works.
          </li>
        </ul>
        <p>Nothing else: no date of birth, no address, no phone number, no payment details.</p>
      </Section>

      <Section id="why" title="Why, and on what basis">
        <ul>
          <li>
            <strong>Your account, your notes and showing them on Swiftter</strong>: to give you the service you signed up for (GDPR art. 6(1)(b), performance of
            a contract: the <Link href="/terms">terms</Link>).
          </li>
          <li>
            <strong>Checking every note before it is published, and keeping the decision</strong>: to keep Swiftter kind and safe, and to be able to explain or
            review a decision (art. 6(1)(f), legitimate interest).
          </li>
          <li>
            <strong>Security</strong> (sessions, request logs, the bot check on sign-in and on writing, limits on how fast notes can be written): to keep
            accounts and the feed safe from abuse (art. 6(1)(f), legitimate interest).
          </li>
          <li>
            <strong>Audience measurement</strong> (Vercel Web Analytics: how many people visit which pages, and how often the site&apos;s main features are
            used, in aggregate): to see what the site is used for and improve it (art. 6(1)(f), legitimate interest).
          </li>
          <li>
            <strong>Encrypted backups of the database</strong>: to recover from an accident (art. 6(1)(f), legitimate interest).
          </li>
        </ul>
        <p>
          No decision with legal or similarly significant effects is made about you automatically: the moderation check only decides whether one note is shown,
          and you can ask a person to look at it again (see the <Link href="/terms#moderation">terms</Link>).
        </p>
      </Section>

      <Section id="who-else" title="Who else handles it">
        <p>These companies process data for the site, each under its own data processing terms. Nothing is sold, and nothing is shared for advertising.</p>
        <ul>
          <li>
            <strong>Vercel Inc.</strong> (United States): hosts the site and runs its code, keeps its request logs, measures the audience (Web Analytics),
            checks for bots when you sign in or write, and relays each note to the moderation model through its AI Gateway.
          </li>
          <li>
            <strong>Neon</strong> (United States; servers in the AWS us-east-1 region, Virginia): the database where accounts, sessions, notes and moderation
            decisions are stored, and the sign-in service (Neon Auth).
          </li>
          <li>
            <strong>Anthropic, PBC</strong> (United States): its Claude model reads the text of each note to check it against the community rules. It receives
            the note&apos;s text only, not your name or email address.
          </li>
          <li>
            <strong>Google</strong>: only if you choose &ldquo;Continue with Google&rdquo;, to sign you in. Its own privacy policy applies to your Google
            account.
          </li>
          <li>
            <strong>GitHub, Inc.</strong> (United States): stores the weekly database backups, encrypted with a key only the publisher holds.
          </li>
          <li>
            <strong>Deezer</strong> (France): album covers and 30-second previews. The site sends Deezer nothing about you; when you play a preview, your
            browser fetches the audio straight from Deezer&apos;s servers, which see your IP address as any website would.
          </li>
          <li>
            <strong>Cloudinary</strong> (United States): hosts the site&apos;s own photos and videos. Your browser loads some of them straight from Cloudinary,
            which sees your IP address as any website would. Nothing you write or upload goes there.
          </li>
        </ul>
        <p>
          Several of these are in the United States. Data goes there under the European Commission&apos;s standard contractual clauses in each company&apos;s
          data processing terms, or the EU–US Data Privacy Framework where the company is certified under it. You can ask for a copy of the safeguards at{" "}
          <ContactEmail />.
        </p>
      </Section>

      <Section id="how-long" title="How long it is kept">
        <ul>
          <li>
            <strong>Your account</strong>, as long as you keep it. Delete it yourself whenever you like from <Link href="/guestbook">your guestbook page</Link>:
            your account, email address, password hash, picture and sessions go at once. Your notes are torn up (their text erased), your reshares are deleted,
            and your name no longer appears anywhere.
          </li>
          <li>
            <strong>Published notes and replies</strong>, until you tear them up or delete your account.
          </li>
          <li>
            <strong>A torn-up note</strong>: its text and the check&apos;s reasons are erased at once. An empty placeholder with no text and no name stays only
            while other Members&apos; replies or reshares point to it, so their threads still read; otherwise it is removed within {TOMBSTONE_MINUTES} minutes,
            or at the next daily clean-up.
          </li>
          <li>
            <strong>Refused notes</strong>, and notes the check could not decide on within {MODERATION_RETRY.days} days, are deleted with their moderation
            history {RETENTION_DAYS} days after they were written.
          </li>
          <li>
            <strong>The check&apos;s reason on an allowed note</strong> is erased after {RETENTION_DAYS} days; the decision itself (allowed, the model) stays
            with the note.
          </li>
          <li>
            <strong>Backups</strong> are kept 30 days, then deleted, so something you deleted can survive in a backup for up to 30 days.
          </li>
          <li>
            <strong>Request logs</strong>, for the short time the host keeps them.
          </li>
          <li>
            <strong>Audience figures</strong>, in aggregate, for as long as Vercel Web Analytics keeps them under the site&apos;s plan.
          </li>
        </ul>
      </Section>

      <Section id="rights" title="Your rights">
        <p>
          Under the GDPR and the French Data Protection Act you can, at any time, do the following. A request by email is answered within one month, the
          deadline the GDPR sets (art. 12(3)).
        </p>
        <ul>
          <li>
            <strong>get a copy of your data</strong> (access and portability): &ldquo;Download your data&rdquo; on{" "}
            <Link href="/guestbook">your guestbook page</Link> gives you everything Swiftter keeps about you, as a file;
          </li>
          <li>
            <strong>delete it</strong> (erasure): &ldquo;Delete my account&rdquo; on the same page, or tear up any note on its own;
          </li>
          <li>
            <strong>correct it</strong> (rectification), <strong>object</strong> to a processing based on legitimate interest, or ask for it to be{" "}
            <strong>restricted</strong>: write to <ContactEmail />;
          </li>
          <li>
            <strong>say what should happen to your data after your death</strong> (French Data Protection Act, art. 85): write to <ContactEmail />.
          </li>
        </ul>
        <p>
          If you think your data is mishandled, please write first; you can also complain to the French data protection authority, the{" "}
          <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>, or the authority of the country you live in.
        </p>
      </Section>

      <Section id="cookies" title="Cookies">
        <p>
          The site sets cookies only when you sign in, and only the ones signing in needs, so it asks for no consent (French Data Protection Act, art. 82:
          strictly necessary cookies). There are no advertising, analytics or tracking cookies: the audience measurement uses none. All are secure, HTTP-only
          cookies on this site&apos;s address:
        </p>
        <ul>
          <li>
            <code>__Secure-neon-auth.session_token</code>: keeps you signed in, until you sign out or the session expires;
          </li>
          <li>
            <code>__Secure-neon-auth.local.session_data</code>: a signed, short-lived copy of who is signed in, so each page need not ask the sign-in service
            again;
          </li>
          <li>
            <code>__Secure-neon-auth.session_challenge</code>: only while you sign in with Google, to check that the answer coming back is yours.
          </li>
        </ul>
        <p>Signing out or deleting your account removes them.</p>
      </Section>

      <Section id="changes" title="Changes">
        <p>If this policy changes, the new version is published here, with the date it changed.</p>
      </Section>
    </LegalPage>
  );
}
