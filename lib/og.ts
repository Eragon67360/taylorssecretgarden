/*
  Helpers for the images drawn with next/og (app/opengraph-image.tsx), which
  are rendered once, at build time. Both fetch over the network; a failure
  degrades the image (next/og's default face, no photo) instead of failing
  the build.
*/

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700; style: "normal" | "italic" };

/**
 * One of the journal's Google faces as TrueType (next/og cannot read the
 * woff2 files next/font serves), cut down to the glyphs of `text`. Null if
 * Google Fonts cannot be reached.
 */
export async function googleFont(font: Omit<OgFont, "data">, family: string, axes: string, text: string): Promise<OgFont | null> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:${axes}&text=${encodeURIComponent(text)}`;

  try {
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    const response = src ? await fetch(src) : null;

    return response?.ok ? { ...font, data: await response.arrayBuffer() } : null;
  } catch {
    return null;
  }
}

/** An image as a data URL for next/og, or null if it cannot be fetched. */
export async function imageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "image/jpeg";

    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}
