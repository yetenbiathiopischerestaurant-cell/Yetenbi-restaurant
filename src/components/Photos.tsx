"use client";

import Image, { type ImageLoader, type ImageProps, type StaticImageData } from "next/image";
import { createContext, useContext } from "react";
import { cloudinaryUrl, dishSlot, slotOf, type Photo as Uploaded, type Photos } from "@/lib/photos";

/* Owner-uploaded photos (Cloudinary) replace the built-in pictures wherever these helpers are used. */

const PhotosContext = createContext<Photos>({});

export function PhotosProvider({ photos, children }: { photos: Photos; children: React.ReactNode }) {
  return <PhotosContext.Provider value={photos}>{children}</PhotosContext.Provider>;
}

/** The uploaded photo for a built-in picture (static import or "/img/…" path), if the owner replaced it. */
function useUploaded(img: StaticImageData | string): Uploaded | undefined {
  return useContext(PhotosContext)[slotOf(typeof img === "string" ? img : img.src)];
}

/** Cloudinary sizes and compresses the photo itself, so Next's optimiser is not used for these. */
const cloudinaryLoader: ImageLoader = ({ src, width, quality }) =>
  cloudinaryUrl(src, `w_${width},c_limit,f_auto,q_${quality ?? "auto"}`);

/** next/image for a built-in picture, swapped for the uploaded photo when there is one. */
export function Photo({ src, alt, placeholder, ...props }: Omit<ImageProps, "src"> & { src: StaticImageData }) {
  const up = useUploaded(src);
  if (!up) return <Image src={src} alt={alt} placeholder={placeholder} {...props} />;
  const sized = props.fill ? {} : { width: props.width ?? up.width, height: props.height ?? up.height };
  return (
    <Image
      {...props}
      {...sized}
      src={up.url}
      alt={alt}
      loader={cloudinaryLoader}
      placeholder={placeholder === "blur" && up.blur ? "blur" : "empty"}
      blurDataURL={up.blur || undefined}
    />
  );
}

/** URL of a small, heavily blurred copy for the candle-light backdrops (Ambient). */
export function useAmbientUrl(img: StaticImageData) {
  const up = useUploaded(img);
  return up ? cloudinaryUrl(up.url, "w_96,e_blur:400,q_40,f_auto") : `/img/ambient/${slotOf(img.src)}.jpg`;
}

/** The owner's photo of a menu dish as a square crop of `px` pixels, or undefined while there is none. */
export function useMenuPhoto() {
  const photos = useContext(PhotosContext);
  return (dishId: string, px = 320) => {
    const up = photos[dishSlot(dishId)];
    return up ? cloudinaryUrl(up.url, `c_fill,g_auto,w_${px},h_${px},f_auto,q_auto`) : undefined;
  };
}

/** Turns a dish picture path into a square, 320px crop of the uploaded photo, if there is one (the platter). */
export function useDishUrl() {
  const photos = useContext(PhotosContext);
  return (path: string) => {
    const up = photos[slotOf(path)];
    return up ? cloudinaryUrl(up.url, "c_fill,g_auto,w_320,h_320,f_auto,q_auto") : path;
  };
}
