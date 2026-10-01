import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ContactEmail, LegalPage, Section } from "@/components/legal-page";
import { LIMITS, MAX_NOTE_CHARACTERS, MINIMUM_AGE, MODERATION_RETRY } from "@/lib/swiftter";
import { pageMetadata } from "@/lib/metadata";
import { RETENTION_DAYS } from "@/service/swiftter";

export const metadata = pageMetadata({
  title: "Terms and community rules",
  description:
    "Swiftter's community rules and the terms of Taylor's Secret Garden: who can join, how every note is checked before it is published, how to report a note or ask for a human review.",
  path: "/terms",
});

const CONTENTS = [
  { id: "about", title: "What this is" },
  { id: "joining", title: "Who can join" },
  { id: "rules", title: "The community rules" },
  { id: "moderation", title: "How notes are checked" },
  { id: "reporting", title: "Reporting a note" },
  { id: "your-notes", title: "Your notes" },
  { id: "leaving", title: "Leaving, or being asked to" },
  { id: "liability", title: "The fine print" },
];

/**
 * The terms and Swiftter's community rules (DSA art. 14: the restrictions
 * and how they are enforced, automated checks included). The rules restate
 * service/moderation.ts's MODERATION_POLICY for people: change both together.
 */
export default function TermsPage() {
  return (
    <LegalPage
      contents={CONTENTS}
      intro={
        <>
          The few rules that keep Swiftter a kind place to pass notes, and what you and the site agree to when you sign the guestbook. Short version: be kind,
          keep it safe, keep it about Taylor, and be {MINIMUM_AGE} or older.
        </>
      }
      kicker="the small print · house rules"
      title="Terms and community rules"
      updated="1 October 2026"
    >
      <Section id="about" title="What this is">
        <p>
          Taylor&apos;s Secret Garden is a free, unofficial fan site, kept by <strong>{siteConfig.publisher}</strong> (see the{" "}
          <Link href="/legal">legal notice</Link>). Anyone can read it. Members, people who have signed the guestbook, can also pass notes on Swiftter, its
          small fan feed: write notes and replies, and reshare other Members&apos; notes. Using Swiftter means accepting these terms; the{" "}
          <Link href="/privacy">privacy policy</Link> says what is kept about you.
        </p>
      </Section>

      <Section id="joining" title="Who can join">
        <ul>
          <li>
            <strong>You must be {MINIMUM_AGE} or older to become a Member.</strong> {MINIMUM_AGE} is the age from which French law lets you agree to an online
            service&apos;s use of your data on your own (GDPR art. 8, French Data Protection Act art. 45). The site asks no date of birth: signing the guestbook
            means you confirm your age. An account found to belong to someone younger is deleted.
          </li>
          <li>One account per person, in a name that is not someone else&apos;s: no pretending to be Taylor, another fan or anybody real.</li>
          <li>Keep your password to yourself. What is written from your account is written by you.</li>
        </ul>
      </Section>

      <Section id="rules" title="The community rules">
        <p>Every note and reply must keep these three rules. When in doubt, a note is allowed.</p>
        <h3>1. Kindness</h3>
        <p>
          No insults, harassment, threats or demeaning anyone: another fan, Taylor, or anybody else. No hate towards any group of people. Teasing, strong
          opinions, disappointment, a swear word for emphasis and criticism of songs, albums or tours are all fine: only what is aimed at hurting someone is
          not.
        </p>
        <h3>2. Safe to share</h3>
        <p>No note may:</p>
        <ul>
          <li>
            share anyone&apos;s personal details: a home or exact address, a phone number, an email address, an ID or bank detail, a ticket&apos;s barcode or QR
            code, or where a private person (or Taylor, off stage) is right now or lives;
          </li>
          <li>
            scam or phish fans: tickets or merchandise sold outside official sellers, requests for payment (gift cards, crypto, &ldquo;friends and family&rdquo;
            transfers), giveaways that ask for money or personal details, links pretending to lead somewhere they don&apos;t;
          </li>
          <li>be sexually explicit or sexualise anyone (never anything sexual involving minors);</li>
          <li>offer, ask for or promote something illegal: drugs, weapons, counterfeits, pirated or leaked music, hacking accounts;</li>
          <li>copy out the full lyrics of a song, or most of them.</li>
        </ul>
        <p>
          Naming a city or a concert, quoting a line or a few lines of a song, talking about tickets, swapping friendship bracelets, and linking to fan sites,
          social media, streaming services, news or official stores are all fine.
        </p>
        <h3>3. On topic</h3>
        <p>
          Notes are about Taylor Swift, her music, Eras and Tours, or fan life: bracelets, outfits, tickets, meeting other fans, what a song makes you feel,
          this site. Loosely connected chatter and a friendly hello count. Advertising, spam and notes about something else entirely do not.
        </p>
        <p>
          Notes are limited to {MAX_NOTE_CHARACTERS.toLocaleString("en")} characters, and to {LIMITS.post.count} notes and {LIMITS.reply.count} replies every{" "}
          {LIMITS.post.minutes} minutes, to keep the feed from being flooded.
        </p>
      </Section>

      <Section id="moderation" title="How notes are checked">
        <p>
          <strong>An AI reads every note and reply before it is published.</strong> Anthropic&apos;s Claude model, reached through Vercel AI Gateway, checks its
          text against the three rules above, and nothing else: it does not see your name or email address.
        </p>
        <ul>
          <li>If the note keeps the rules, it is published straight away.</li>
          <li>
            If it breaks one, it is not published. It stays in your margin, where only you can see it, with the rule it broke and a one-line reason, for{" "}
            {RETENTION_DAYS} days; then it is deleted.
          </li>
          <li>
            If the check cannot be reached, the note waits, visible only to you, and is checked again automatically for up to {MODERATION_RETRY.days} days.
          </li>
        </ul>
        <p>
          The check can be wrong. <strong>If you think a note was refused by mistake, press &ldquo;Ask a human to look again&rdquo;</strong> on the refused
          note, or write to <ContactEmail /> saying which note. {siteConfig.publisher} looks at it himself; if the refusal was wrong, the note is published.
        </p>
      </Section>

      <Section id="reporting" title="Reporting a note">
        <p>
          The check misses things too. If a published note breaks the rules or the law, <strong>press &ldquo;Report&rdquo; on the note</strong>, or write to{" "}
          <ContactEmail /> with its link and what is wrong with it. Every report is read by a person, and a note that breaks the rules is removed.
        </p>
      </Section>

      <Section id="your-notes" title="Your notes">
        <ul>
          <li>
            What you write stays yours. By publishing a note you let this site show it on Swiftter, free of charge, for as long as it is published; you can tear
            up any of your notes at any time.
          </li>
          <li>Only write what you have the right to share: your own words and pictures, short quotes, links. You are responsible for what you publish.</li>
          <li>Notes cannot be edited. Tear one up and write it again.</li>
        </ul>
      </Section>

      <Section id="leaving" title="Leaving, or being asked to">
        <p>
          You can delete your account whenever you like from <Link href="/guestbook">your guestbook page</Link>, and download what Swiftter keeps about you
          there first. Your notes are torn up and your name taken off them.
        </p>
        <p>
          A Member who seriously or repeatedly breaks these rules can have notes removed and their account closed. If that happens to you and you think it was a
          mistake, write to <ContactEmail />.
        </p>
      </Section>

      <Section id="liability" title="The fine print">
        <ul>
          <li>The site is a free hobby project, kept as well as one fan can: it may be unavailable now and then, change, or stop.</li>
          <li>
            Members are responsible for their notes. The site removes unlawful content promptly once it is reported, but cannot read everything before others
            do.
          </li>
          <li>Links to other sites are there to be helpful; those sites are their owners&apos; responsibility.</li>
          <li>
            These terms are governed by French law. Nothing in them takes away the rights the law of your country gives you. A disagreement is best sorted out
            by writing to <ContactEmail /> first.
          </li>
          <li>If these terms change, the new version is published here with its date; continuing to use Swiftter means accepting it.</li>
        </ul>
      </Section>
    </LegalPage>
  );
}
