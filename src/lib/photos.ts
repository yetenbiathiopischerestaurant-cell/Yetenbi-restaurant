/*
  Photos the owner can replace in /admin → Fotos. Each slot is one of the site's built-in pictures
  (public/img); an uploaded photo lives on Cloudinary and is shown instead, the built-in one is the fallback.
*/

type PhotoSlot = { key: string; label: string; where: string };

export const PHOTO_SLOTS: PhotoSlot[] = [
  { key: "hero", label: "Titelbild", where: "Ganz oben, hinter dem Namen; auch Hintergrund bei „Die Platte“" },
  { key: "platter", label: "Platte", where: "Willkommen-Text (kleines Bild im Satz)" },
  { key: "baskets", label: "Körbe", where: "Willkommen-Text und Hintergrund" },
  { key: "jebena-pour", label: "Kaffee eingießen", where: "Willkommen-Text und Kaffeezeremonie, Runde 1" },
  { key: "cups", label: "Tassen", where: "Kaffeezeremonie Runde 2, Speisekarte rechts, Anfahrt" },
  { key: "incense", label: "Weihrauch", where: "Kaffeezeremonie, Runde 3" },
  { key: "jebena-set", label: "Jebena-Set", where: "Speisekarte links, Anfahrt (großes Bogenbild)" },
  { key: "bowls", label: "Schalen", where: "Hintergrund der Speisekarte" },
  { key: "dish/kitfo", label: "Gericht: Kitfo", where: "Die Platte" },
  { key: "dish/tibs", label: "Gericht: Tibs", where: "Die Platte" },
  { key: "dish/keywot", label: "Gericht: Key Wot", where: "Die Platte" },
  { key: "dish/misir", label: "Gericht: Misir", where: "Die Platte" },
  { key: "dish/shiro", label: "Gericht: Shiro", where: "Die Platte" },
  { key: "dish/atkilt", label: "Gericht: Atkilt", where: "Die Platte" },
];
export const SLOT_KEYS = new Set(PHOTO_SLOTS.map((s) => s.key));

/** An uploaded photo: Cloudinary address, size, and a tiny blurred preview shown while it loads. */
export type Photo = { url: string; publicId: string; width: number; height: number; blur: string };
export type Photos = Record<string, Photo>;

/**
  The same Cloudinary photo with a transformation, e.g. "w_800,c_limit,f_auto,q_auto". It is served through this
  site (/foto/…, a rewrite in next.config.ts), so visitors' browsers never connect to Cloudinary (privacy policy § 10).
*/
export const cloudinaryUrl = (url: string, transform: string) => {
  const parts = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  return parts
    ? `/foto/${parts[1]}/${transform}/${parts[2]}`
    : url.replace("/image/upload/", `/image/upload/${transform}/`);
};

/** The slot of a built-in picture, from its file path ("/_next/static/media/hero.1a2b.jpg" → "hero"). */
export const slotOf = (path: string) => {
  const dish = path.match(/\/img\/dish\/([a-z]+)\./);
  if (dish) return `dish/${dish[1]}`;
  return path.split("/").pop()!.split(".")[0];
};
