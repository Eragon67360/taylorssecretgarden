# AI moderation before a Post is stored, failing closed

Insults and off-topic Posts went straight into Swiftter's feed. There is no one to moderate after the fact (no queue, no admin UI), so each new Post is judged by a small, fast model before it is stored: `anthropic/claude-haiku-4.5` through Vercel AI Gateway, with AI SDK 7's structured output (`allowed`, `insult` or `off_topic`, plus a reason), temperature 0 and a 3-second timeout. The Gateway rather than a provider key: one credential that Vercel supplies to deployments (OIDC), and the model is a string we can change.

- The policy is one plain-language constant (`MODERATION_POLICY` in `service/moderation.ts`) so the owner can adjust it. Off-topic is judged leniently: any fan chatter passes, and "when in doubt, allow".
- The Post's plain text (tags stripped, entities decoded, one line per paragraph: `postPlainText`) is sent between `<post>` tags as untrusted data, and the instructions say anything inside it is content to judge, never instructions to follow.
- It fails closed: with no verdict (Gateway down, timeout, no credits) nothing is published and the Member is asked to try again, their text kept. So publishing depends on AI Gateway being enabled, with a card on file, for the Vercel team.
- It runs after the cheap checks (session, BotID, posting limit, sanitising; ADR-0005), so refused or limited requests cost nothing.
- CI and the Playwright suite use a deterministic fake (`SWIFTTER_MODERATION=fake`, marker words decide) and never call the model; Vercel deployments ignore the switch. An opt-in script (`npm run moderation:check`) runs the real model on sample Posts to check the policy.
- Only new Posts are moderated: not existing ones, nor Member names or avatars.
