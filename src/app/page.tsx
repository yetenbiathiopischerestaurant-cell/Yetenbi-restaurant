import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Intro from "@/components/intro/Intro";
import ScrollProgress from "@/components/motion/ScrollProgress";
import SideRail from "@/components/SideRail";
import Manifesto from "@/components/sections/Manifesto";
import Platte from "@/components/sections/Platte";
import MenuCard from "@/components/sections/MenuCard";
import Buna from "@/components/sections/Buna";
import Info from "@/components/sections/Info";
import ProverbBand from "@/components/sections/ProverbBand";
import Amharisch from "@/components/sections/Amharisch";
import Visit from "@/components/sections/Visit";
import Reservation from "@/components/sections/Reservation";
import Footer from "@/components/sections/Footer";
import StructuredData from "@/components/StructuredData";
import { PhotosProvider } from "@/components/Photos";
import { getPhotos } from "@/lib/server/photos";
import { MenuProvider } from "@/components/MenuFacts";
import { getMenu } from "@/lib/server/menu";
import { getBusiness } from "@/lib/server/business";
import { HoursProvider, SectionsProvider } from "@/components/Business";
import { getSiteSections } from "@/lib/server/site-sections";

export default async function Home() {
  // photos and menu from the database (cached; refreshed when the owner changes them)
  // The owner can switch the menu and the reservation section off for a while (admin → Speisekarte).
  const [photos, menu, business, sections] = await Promise.all([
    getPhotos(),
    getMenu(),
    getBusiness(),
    getSiteSections(),
  ]);
  return (
    <PhotosProvider photos={photos}>
      <MenuProvider menu={menu}>
        <HoursProvider hours={business.hours}>
          <SectionsProvider sections={sections}>
            <StructuredData menu={sections.menu ? menu : []} hours={business.hours} />
            <Intro />
            <ScrollProgress />
            <SideRail />
            <Header />
            {/* overflow-x-clip (not hidden) so the pinned platter and coffee rounds keep working */}
            <main id="main" className="w-full max-w-full flex-1 overflow-x-clip">
              <Hero />
              <Manifesto />
              <Platte />
              {sections.menu && <MenuCard />}
              <Buna />
              <ProverbBand />
              <Info />
              <Amharisch />
              <Visit />
              {sections.reservations && <Reservation />}
            </main>
            <Footer />
          </SectionsProvider>
        </HoursProvider>
      </MenuProvider>
    </PhotosProvider>
  );
}
