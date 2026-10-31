/*
  Sections of the home page the owner can switch off for a while in /admin → Speisekarte (stored in Neon, key
  "sections"). Off hides the section, its links in the header, hero and side rail, and (for reservations) the
  booking API. Both are on until the owner switches them off.
*/
export type SiteSections = { menu: boolean; reservations: boolean };

export const DEFAULT_SECTIONS: SiteSections = { menu: true, reservations: true };
