import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { GardenMark } from "@/components/garden-mark";

// The home-screen icon: the garden's mark on journal paper (iOS fills
// transparency with black, so the paper is part of the image).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: siteConfig.colors.paper }}>
        <GardenMark petals={siteConfig.colors.accent} size={140} />
      </div>
    ),
    size,
  );
}
