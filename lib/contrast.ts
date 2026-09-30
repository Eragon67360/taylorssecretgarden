/*
  WCAG 2.2 contrast between two colours, for checks axe cannot make: axe
  measures text, not the edges of a control or a progress fill (1.4.11, 3:1).
  Colours are opaque hex, as in the Era looks (lib/eras.ts).
*/

/** The relative luminance of an opaque `#rgb` or `#rrggbb` colour. */
export function luminance(hex: string): number {
  const digits = hex.replace(/^#/, "");
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;

  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not an opaque hex colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = parseInt(full.slice(start, start + 2), 16) / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two colours, from 1 (the same) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (light + 0.05) / (dark + 0.05);
}
