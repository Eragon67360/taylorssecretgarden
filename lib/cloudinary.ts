/*
  Cloudinary delivery URLs. A module of its own (no data imports) so client
  components can build URLs without shipping the Tours data to the browser.
*/

/** A Cloudinary delivery URL with a width transformation, for a small, fast copy. */
export function cloudinaryWidth(url: string, width: number) {
  return url.replace("/upload/", `/upload/w_${width},c_limit,`);
}

/** A still frame of a Cloudinary video, for its poster. */
export function videoStill(url: string, width: number) {
  return url.replace(/\/upload\/[^/]*\/v1\//, `/upload/so_12,w_${width},c_limit,f_auto,q_auto/v1/`) + ".jpg";
}

/**
 * The home page's Eras Tour photo (also on the Open Graph card), cropped to a
 * 4:5 print around Taylor. `format` is `auto` for browsers, `jpg` for next/og.
 */
export function homePhoto(width: number, format: "auto" | "jpg" = "auto") {
  return `https://res.cloudinary.com/dluezegi8/image/upload/f_${format},q_auto,c_fill,g_auto,ar_4:5,w_${width}/v1/images/upload/taylorssecretgarden/backgrounds/home`;
}
