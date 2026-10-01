/*
  The development fixtures (scripts/seed.ts), shared with scripts/unseed.ts.
  Fictional people and original text only: no real fans, no Taylor Swift
  quotes, no lyrics. Every id is fixed, so the seed is deterministic and
  re-running it changes nothing.
*/

/** The one password of every seed account: obviously not a real one, and never on production (db/guard.ts). */
export const SEED_PASSWORD = "seed-password-not-for-production";

/** Seed accounts' address domain (`.invalid` can never be a real mailbox). Unseed matches the exact addresses below, not the domain. */
export const SEED_DOMAIN = "seed.invalid";

export type SeedUserKey = "wren" | "dario" | "noor" | "sunny" | "quiet" | "long";

export const SEED_USERS: Record<SeedUserKey, { name: string; email: string }> = {
  wren: { name: "Wren Holloway", email: `wren@${SEED_DOMAIN}` },
  dario: { name: "Dario Mendes", email: `dario@${SEED_DOMAIN}` },
  noor: { name: "Noor Haddad", email: `noor@${SEED_DOMAIN}` },
  sunny: { name: "Sunny Okafor", email: `sunny@${SEED_DOMAIN}` },
  // Never writes: the empty state of a Member.
  quiet: { name: "Quinn Ashby", email: `quiet@${SEED_DOMAIN}` },
  // A very long display name, for layouts.
  long: { name: "Maximiliana Theodora Beaumont-Featherstone of the Friendship Bracelet Trading Society", email: `long@${SEED_DOMAIN}` },
};

export const SEED_EMAILS = Object.values(SEED_USERS).map((user) => user.email);

/** `5eed0000-0000-4000-8000-<n>`: a fixed, valid UUID per fixture. */
export const seedId = (kind: "p" | "r", n: number) => `5eed0000-0000-4000-8${kind === "p" ? "000" : "001"}-${String(n).padStart(12, "0")}`;

type Moderation = { status: "approved" } | { status: "blocked"; category: "insult" | "off_topic"; reason: string } | { status: "pending" };

export type SeedNote = {
  id: string;
  by: SeedUserKey;
  html: string;
  /** Minutes after the seed's epoch (2026-07-01T00:00Z), so every note has a fixed time, before the demo content. */
  at: number;
  parent?: string;
  moderation?: Moderation;
  /** Torn up after publication (tombstone). */
  tornUp?: boolean;
};

export const SEED_EPOCH = Date.parse("2026-07-01T00:00:00Z");

const TOPICS = [
  "Third listen of the new album today and the production on track seven keeps revealing new layers.",
  "Made twenty friendship bracelets on the train and ran out of the letter E halfway through.",
  "Ranking the Eras by which one I'd want to live inside for a week: folklore wins, obviously.",
  "Reminder that the surprise-song acoustic sets deserve their own documentary.",
  "My sister finally listened to Speak Now front to back and now she understands me.",
  "Hot take: the Red era had the best outfits and nobody can convince me otherwise.",
  "Found my old concert ticket from years ago in a book. Instantly emotional.",
  "The bridge on that one deep cut does more in forty seconds than most whole songs.",
  "Planning a listening party for the anniversary: snacks themed by album, obviously.",
  "Is it just me or does evermore sound completely different on a rainy afternoon?",
  "Learned the piano intro to my favourite track this week. Slowly. Very slowly.",
  "Every time the 1989 re-recording comes on shuffle I have to stop what I'm doing.",
];

/** 52 top-level Posts across two feed pages and more, plus the edge cases. */
function posts(): SeedNote[] {
  const authors: SeedUserKey[] = ["wren", "dario", "noor", "sunny", "long"];
  const notes: SeedNote[] = Array.from({ length: 44 }, (_, index) => ({
    id: seedId("p", index + 1),
    by: authors[index % authors.length],
    html: `<p>${TOPICS[index % TOPICS.length]} <em>(seed note ${index + 1})</em></p>`,
    at: index * 360,
  }));

  notes.push(
    // The shortest possible note: one character (an emoji is one).
    { id: seedId("p", 45), by: "sunny", html: "<p>✨</p>", at: 44 * 360 },
    // Exactly the longest a note can be: 1000 characters.
    { id: seedId("p", 46), by: "wren", html: `<p>${"Long note. ".repeat(90)}${"x".repeat(10)}</p>`, at: 45 * 360 },
    // Unicode, emoji, accents, combining marks and non-Latin scripts.
    {
      id: seedId("p", 47),
      by: "dario",
      html: "<p>Café au lait ☕ + folklore 🌲 = perfect Sunday. Ça fait du bien. 東京公演の思い出 🎶 Ñandú, naïve, Zoë, é</p>",
      at: 46 * 360,
    },
    // Right-to-left: Arabic, Hebrew, and a mixed line.
    {
      id: seedId("p", 48),
      by: "noor",
      html: "<p>أحب هذا الألبوم كثيرًا، كل أغنية فيه قصة.</p><p>האלבום הזה מלווה אותי כל הקיץ.</p><p>Mixed: my favourite era هو الأفضل, no question.</p>",
      at: 47 * 360,
    },
    // Formatting: lists and a link.
    {
      id: seedId("p", 49),
      by: "wren",
      html: '<p><strong>Bracelet checklist</strong> for the next show:</p><ul><li><p>letter beads</p></li><li><p>elastic</p></li></ul><p>More ideas <a href="https://example.com/bracelets">here</a>.</p>',
      at: 48 * 360,
    },
    // Refused by moderation: its author alone sees it, with the reason.
    {
      id: seedId("p", 50),
      by: "dario",
      html: "<p>Seed example of a note moderation refused as unkind (placeholder text, nothing hurtful).</p>",
      at: 49 * 360,
      moderation: { status: "blocked", category: "insult", reason: "Seed: stands in for a note aimed at another fan." },
    },
    {
      id: seedId("p", 51),
      by: "sunny",
      html: "<p>Seed example of an advert moderation refused as off-topic.</p>",
      at: 49 * 360 + 30,
      moderation: { status: "blocked", category: "off_topic", reason: "Seed: stands in for an advert unrelated to Taylor." },
    },
    // No verdict yet: pending, its author alone sees it.
    {
      id: seedId("p", 52),
      by: "noor",
      html: "<p>Seed example of a note still waiting for a moderation check.</p>",
      at: 49 * 360 + 60,
      moderation: { status: "pending" },
    },
    // Published, reshared, then torn up: its reshare shows it as torn up.
    { id: seedId("p", 53), by: "sunny", html: "<p>Seed note that was reshared, then torn up by its author.</p>", at: 50 * 360, tornUp: true },
  );

  return notes;
}

/** Replies: a deep thread (eight levels) on the first Post, a wide one on the second, a refused reply. */
function replies(): SeedNote[] {
  const deep: SeedUserKey[] = ["dario", "noor", "sunny", "wren", "long", "dario", "noor", "sunny"];
  const notes: SeedNote[] = deep.map((by, index) => ({
    id: seedId("r", index + 1),
    by,
    html: `<p>Reply ${index + 1} in the deep thread: ${["agreed", "fair point", "but consider the bridge", "counterpoint: the outro", "okay you win", "wait, which version?", "the re-recording, always", "this thread is my new home"][index]}.</p>`,
    at: 51 * 360 + index * 7,
    parent: index === 0 ? seedId("p", 1) : seedId("r", index),
  }));

  for (const [index, by] of (["wren", "noor", "sunny", "long"] as const).entries()) {
    notes.push({
      id: seedId("r", 20 + index),
      by,
      html: `<p>Sibling reply ${index + 1} on the second note.</p>`,
      at: 52 * 360 + index * 5,
      parent: seedId("p", 2),
    });
  }
  // A reply under a reply in the wide thread.
  notes.push({ id: seedId("r", 30), by: "dario", html: "<p>Answering the first sibling directly.</p>", at: 53 * 360, parent: seedId("r", 20) });
  // A refused reply.
  notes.push({
    id: seedId("r", 31),
    by: "dario",
    html: "<p>Seed example of a reply moderation refused (placeholder text).</p>",
    at: 53 * 360 + 10,
    parent: seedId("p", 2),
    moderation: { status: "blocked", category: "insult", reason: "Seed: stands in for an unkind reply." },
  });

  return notes;
}

export const SEED_NOTES: SeedNote[] = [...posts(), ...replies()];

/** Reshares: [who, which Post, minutes after the epoch]. One reshares the Post torn up since. */
export const SEED_RESHARES: [SeedUserKey, string, number][] = [
  ["wren", seedId("p", 2), 54 * 360],
  ["noor", seedId("p", 1), 54 * 360 + 20],
  ["dario", seedId("p", 48), 54 * 360 + 40],
  ["wren", seedId("p", 53), 50 * 360 + 30],
  ["long", seedId("p", 47), 54 * 360 + 60],
];
