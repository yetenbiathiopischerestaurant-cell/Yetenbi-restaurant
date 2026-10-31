"use client";

import { createContext, useContext } from "react";
import { WEEK, type DayHours } from "@/lib/hours";
import { DEFAULT_SECTIONS, type SiteSections } from "@/lib/site-sections";

/* The opening hours the owner set in /admin, for the hours table and the reservation times on the website. */

const HoursContext = createContext<DayHours[]>(WEEK);

export function HoursProvider({ hours, children }: { hours: DayHours[]; children: React.ReactNode }) {
  return <HoursContext.Provider value={hours}>{children}</HoursContext.Provider>;
}

export const useHours = () => useContext(HoursContext);

/* Which home page sections the owner has switched on (menu, reservations). */

const SectionsContext = createContext<SiteSections>(DEFAULT_SECTIONS);

export function SectionsProvider({ sections, children }: { sections: SiteSections; children: React.ReactNode }) {
  return <SectionsContext.Provider value={sections}>{children}</SectionsContext.Provider>;
}

export const useSections = () => useContext(SectionsContext);
