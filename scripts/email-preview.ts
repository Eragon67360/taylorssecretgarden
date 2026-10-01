/* eslint-disable no-console -- command-line script: its output is the report */
// Writes every account email (lib/emails/samples.ts) to .email-preview/
// (git-ignored), as <slug>.html and <slug>.txt, to open in a browser or
// paste into a mail client's tester. The wordmark is loaded from public/ so
// the files show it before it is deployed; the links point at production.
//
// Usage: npm run email:preview
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { renderAuthEmail } from "../lib/emails/auth-emails";
import { EMAIL_SAMPLES } from "../lib/emails/samples";

const out = join(process.cwd(), ".email-preview");
// No trailing slash: the layout appends the image's path, which starts with one.
const assetsUrl = pathToFileURL(join(process.cwd(), "public")).href;

mkdirSync(out, { recursive: true });

for (const { slug, title, email } of EMAIL_SAMPLES) {
  const { subject, html, text } = renderAuthEmail(email, { assetsUrl });

  writeFileSync(join(out, `${slug}.html`), html);
  writeFileSync(join(out, `${slug}.txt`), `Subject: ${subject}\n\n${text}`);
  console.log(`${title}: .email-preview/${slug}.html (and .txt)`);
}
