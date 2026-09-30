# AI moderation before a Post is stored, failing closed

> Superseded in part by [ADR-0007](0007-social-feed-and-stored-moderation.md): refused notes are now stored (author only), a note with no verdict is kept pending instead of refused with 503, and replies are moderated too. The model, policy, prompt handling and fake below still hold; the timeout is 8 s.

> Amended 2026-09-30 (#75): notes could carry links the model never saw, and the policy let personal details, scams and full lyrics through. The model now reads each link's destination after its text (`postModerationText`: `label (link: https://…)`, for moderation only), and the policy gains a "safe to share" rule between kindness and on-topic: no one's personal details, no scams or unofficial resale, no sexual or illegal content, no full lyrics (quoting a line is fine). Its refusals get a third category, `restricted`, stored as text like the others (no migration); the fake knows `fake-restricted`.

Insults and off-topic Posts went straight into Swiftter's feed. There is no one to moderate after the fact (no queue, no admin UI), so each new Post is judged by a small, fast model before it is stored: `anthropic/claude-haiku-4.5` through Vercel AI Gateway, with AI SDK 7's structured output (`allowed`, `insult` or `off_topic`, plus a reason), temperature 0 and a 3-second timeout. The Gateway rather than a provider key: one credential that Vercel supplies to deployments (OIDC), and the model is a string we can change.

- The policy is one plain-language constant (`MODERATION_POLICY` in `service/moderation.ts`) so the owner can adjust it. Off-topic is judged leniently: any fan chatter passes, and "when in doubt, allow".
- The Post's plain text (tags stripped, entities decoded, one line per paragraph: `postPlainText`) is sent between `<post>` tags as untrusted data, and the instructions say anything inside it is content to judge, never instructions to follow.
- It fails closed: with no verdict (Gateway down, timeout, no credits) nothing is published and the Member is asked to try again, their text kept. So publishing depends on paid AI Gateway credits on the Vercel team that owns the project (Le Bon Tempérament since 2026-09-30; its free tier refuses this model).
- It runs after the cheap checks (session, BotID, posting limit, sanitising; ADR-0005), so refused or limited requests cost nothing.
- CI and the Playwright suite use a deterministic fake (`SWIFTTER_MODERATION=fake`, marker words decide) and never call the model; Vercel deployments ignore the switch. An opt-in script (`npm run moderation:check`) runs the real model on sample Posts to check the policy.
- Only new Posts are moderated: not existing ones, nor Member names or avatars.
