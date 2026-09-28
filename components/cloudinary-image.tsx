"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";

import { cloudinaryWidth } from "@/lib/cloudinary";

// Cloudinary resizes each copy (the URLs already ask it for f_auto,q_auto),
// so next/image only writes the srcset; no optimisation pass on our server.
const cloudinaryLoader: ImageLoader = ({ src, width }) => cloudinaryWidth(src, width);

/** A next/image for a Cloudinary delivery URL (tours.json). */
export function CloudinaryImage({ alt, ...props }: Omit<ImageProps, "loader">) {
  return <Image alt={alt} loader={cloudinaryLoader} {...props} />;
}
