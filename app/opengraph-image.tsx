import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { GardenMark } from "@/components/garden-mark";
import { homePhoto } from "@/lib/cloudinary";
import { googleFont, imageDataUrl } from "@/lib/og";

// The link preview (Open Graph and X): the journal's opening spread as a
// 1200x630 card, drawn once at build time with the site's own faces.
export const alt = "Taylor's Secret Garden: a Swiftie's scrapbook, with a taped polaroid of Taylor Swift on the Eras Tour";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const KICKER = "dear diary: est. 2006, still not over it";
const CAPTION = "the orange one. I screamed.";
const BLURB = "Every Era's Albums and tracklists, every Tour, and Swiftter, where Swifties pass notes. An unofficial fan scrapbook.";
const { paper, card, ink, soft, accent, tape } = siteConfig.colors;

export default async function OpenGraphImage() {
  const [photo, ...fonts] = await Promise.all([
    imageDataUrl(homePhoto(660, "jpg")),
    googleFont({ name: "Fraunces", weight: 600, style: "normal" }, "Fraunces", "wght@600", "Taylor'sGarden"),
    googleFont({ name: "Fraunces Italic", weight: 400, style: "italic" }, "Fraunces", "ital,wght@1,400", "Secret"),
    googleFont({ name: "Caveat", weight: 700, style: "normal" }, "Caveat", "wght@700", KICKER + CAPTION),
    googleFont({ name: "Karla", weight: 500, style: "normal" }, "Karla", "wght@500", BLURB),
  ]);

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: paper, color: ink, position: "relative" }}>
      {/* The notebook's margin rule. */}
      <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 3, background: "rgba(176, 35, 28, .35)" }} />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 700, paddingLeft: 110, paddingRight: 20 }}>
        <div style={{ display: "flex", fontFamily: "Caveat", fontSize: 36, color: accent, transform: "rotate(-2deg)", marginBottom: 12 }}>{KICKER}</div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Fraunces", fontSize: 116, lineHeight: 0.92, letterSpacing: -2 }}>
          <span>Taylor&apos;s</span>
          <span style={{ fontFamily: "Fraunces Italic", color: accent }}>Secret</span>
          <span>Garden</span>
        </div>
        <div style={{ display: "flex", fontFamily: "Karla", fontSize: 26, lineHeight: 1.4, color: soft, marginTop: 30, maxWidth: 540 }}>{BLURB}</div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: card,
            padding: "16px 16px 0",
            transform: "rotate(3deg)",
            boxShadow: "0 24px 40px -18px rgba(40, 20, 10, .55)",
            position: "relative",
          }}
        >
          {photo ? (
            <img alt="" height={412} src={photo} style={{ objectFit: "cover" }} width={330} />
          ) : (
            <div style={{ display: "flex", width: 330, height: 412, background: accent }} />
          )}
          <div style={{ display: "flex", justifyContent: "center", fontFamily: "Caveat", fontSize: 30, padding: "12px 0 16px" }}>{CAPTION}</div>
          {/* Washi tape holding the print down. */}
          <div style={{ position: "absolute", top: -18, left: 110, width: 140, height: 38, background: tape, transform: "rotate(-6deg)" }} />
        </div>
        <div style={{ display: "flex", position: "absolute", top: 36, left: 12, transform: "rotate(-14deg)" }}>
          <GardenMark petals={accent} size={96} />
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: fonts.filter((font) => font !== null),
    },
  );
}
