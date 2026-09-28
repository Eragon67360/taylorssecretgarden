import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

const HAND = "var(--font-caveat), 'Segoe Print', cursive";
const BODY = "var(--font-karla), system-ui, sans-serif";

/** The site's focus ring (styles/globals.css `focus-ring`): a solid outline in ink. */
const FOCUS = { outline: "2.5px solid var(--ink)", outlineOffset: "2px", boxShadow: "none" };

/**
 * Clerk draws control borders as box-shadows under `[data-variant]` and state
 * selectors that outrank a plain element style. `&&&` repeats the element's
 * class, so these styles win without !important.
 */
const outrankClerk = <T extends object>(style: T) => ({ "&&&": style });

/**
 * Clerk's sign-in and sign-up forms written into the guestbook: the journal's
 * tokens and faces (styles/globals.css), headings in the handwriting face,
 * lined-paper inputs and an ink-stamp button. The card itself is ours
 * (components/guestbook/guestbook.tsx): Clerk renders flush on it.
 *
 * Colours are the journal's CSS variables, so the forms follow the neutral
 * journal look without copying its values.
 */
export const guestbookAppearance = {
  options: {
    elevation: "flush",
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "var(--on-accent)",
    colorBackground: "var(--card)",
    colorForeground: "var(--ink)",
    colorMutedForeground: "var(--soft)",
    colorMuted: "var(--paper)",
    colorInput: "var(--card)",
    colorInputForeground: "var(--ink)",
    colorNeutral: "var(--ink)",
    colorBorder: "var(--line)",
    colorRing: "var(--ink)",
    colorDanger: "var(--pen)",
    colorShadow: "rgba(60, 40, 20, 0.35)",
    fontFamily: BODY,
    fontFamilyButtons: BODY,
    fontSize: "1rem",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", maxWidth: "none", background: "transparent" },
    card: { background: "transparent", paddingInline: 0, paddingBlock: 0, gap: "1.5rem" },
    header: { gap: "0.25rem" },
    headerTitle: { fontFamily: HAND, fontSize: "2rem", fontWeight: 700, lineHeight: 1.05, color: "var(--ink)" },
    headerSubtitle: { fontSize: "0.95rem", color: "var(--soft)" },
    socialButtonsBlockButton: outrankClerk({
      backgroundColor: "var(--paper)",
      border: "none",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--soft) 55%, var(--line)), 0 2px 0 var(--line)",
      color: "var(--ink)",
      "&:hover": { backgroundColor: "color-mix(in srgb, var(--line) 45%, var(--paper))" },
      "&:focus-visible": FOCUS,
    }),
    socialButtonsBlockButtonText: { fontWeight: 600, color: "var(--ink)" },
    dividerLine: { backgroundColor: "var(--line)" },
    dividerText: { fontFamily: HAND, fontSize: "1.2rem", color: "var(--soft)" },
    formFieldLabel: { fontWeight: 700, color: "var(--ink)" },
    formFieldHintText: { color: "var(--soft)" },
    // Writing on a notebook line: no box, a soft-ink rule underneath (3:1 on the card), ink when focused.
    formFieldInput: outrankClerk({
      backgroundColor: "color-mix(in srgb, var(--paper) 35%, var(--card))",
      border: "none",
      borderRadius: 0,
      boxShadow: "inset 0 -2px 0 var(--soft)",
      color: "var(--ink)",
      "&:hover, &:focus": { boxShadow: "inset 0 -2px 0 var(--ink)" },
      "&:focus-visible": FOCUS,
    }),
    formFieldInputShowPasswordButton: { color: "var(--soft)", "&:focus-visible": FOCUS },
    formButtonPrimary: {
      backgroundColor: "var(--accent)",
      backgroundImage: "none",
      color: "var(--on-accent)",
      border: "none",
      boxShadow: "2px 3px 0 color-mix(in srgb, var(--ink) 30%, transparent)",
      fontWeight: 700,
      letterSpacing: "0.02em",
      textTransform: "none",
      "&:hover": { backgroundColor: "color-mix(in srgb, var(--accent) 88%, black)" },
      "&:focus-visible": FOCUS,
      "&::after": { display: "none" },
    },
    footer: { background: "transparent", paddingInline: 0, marginTop: "0.5rem", borderTop: "1px dashed var(--line)" },
    footerAction: { paddingBlock: "1rem 0" },
    footerActionText: { color: "var(--soft)", fontSize: "0.95rem" },
    footerActionLink: {
      color: "var(--accent)",
      fontWeight: 700,
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      "&:hover": { color: "var(--ink)" },
      "&:focus-visible": FOCUS,
    },
    identityPreviewEditButton: { color: "var(--accent)" },
    formResendCodeLink: { color: "var(--accent)" },
    otpCodeFieldInput: { borderColor: "var(--line)", color: "var(--ink)" },
  },
} satisfies Appearance;
