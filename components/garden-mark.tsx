/*
  The garden's mark: a little pressed daisy. Drawn in the site header, on the
  home-screen icon and on the Open Graph card (app/opengraph-image.tsx); app/icon.svg is the
  same drawing as a static file, on a scrap of paper.
*/
import { siteConfig } from "@/config/site";

type GardenMarkProps = {
  /** Petal colour; next/og needs a literal colour, not a CSS variable. */
  petals?: string;
  centre?: string;
  size?: number;
  className?: string;
};

export function GardenMark({ petals = "var(--accent)", centre = siteConfig.colors.petalCentre, size, className }: GardenMarkProps) {
  return (
    <svg aria-hidden="true" className={className} focusable="false" height={size} viewBox="0 0 40 40" width={size}>
      {Array.from({ length: 8 }, (_, index) => (
        <ellipse key={index} cx="20" cy="10" fill={petals} opacity=".8" rx="4.5" ry="9" transform={`rotate(${index * 45} 20 20)`} />
      ))}
      <circle cx="20" cy="20" fill={centre} r="5" />
    </svg>
  );
}
