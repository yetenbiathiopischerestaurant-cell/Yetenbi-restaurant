import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/site-url";
import { Cormorant_Garamond, Outfit, Noto_Sans_Ethiopic } from "next/font/google";
import SmoothScroll from "@/components/motion/SmoothScroll";
import { IntroProvider } from "@/components/intro/IntroState";
import { introSeenScript } from "@/components/intro/seen";
import BackgroundFlames from "@/components/three/BackgroundFlames";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ethiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Yetenbi | Äthiopisches Restaurant & Café in Würzburg",
    template: "%s | Yetenbi",
  },
  description:
    "Authentisch äthiopische Küche in der Theaterstraße 6, Würzburg: Kitfo, Tibs, Wot, vegane Beyaynetu-Platte auf Injera und die traditionelle Kaffeezeremonie. Jetzt Tisch reservieren.",
  keywords: [
    "Äthiopisches Restaurant Würzburg",
    "Ethiopian restaurant Würzburg",
    "Injera",
    "Kaffeezeremonie",
    "vegan Würzburg",
    "Yetenbi",
  ],
  openGraph: {
    type: "website",
    locale: "de_DE",
    alternateLocale: ["en_GB", "am_ET"],
    siteName: "Yetenbi",
    title: "Yetenbi | Äthiopisches Restaurant & Café in Würzburg",
    description: "Würzige Wots, frisches Injera und duftender Jebena-Kaffee, mitten in Würzburg.",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1c1712",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the head script below may add data-intro-seen to <html> before React hydrates.
    <html
      lang="de"
      className={`${cormorant.variable} ${outfit.variable} ${ethiopic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline on purpose: it must run before the first paint (the CSP allows inline scripts). */}
        <script dangerouslySetInnerHTML={{ __html: introSeenScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:bg-gold focus:px-5 focus:py-2.5 focus:text-ink"
        >
          Zum Inhalt springen
        </a>
        <div aria-hidden className="site-bg pointer-events-none fixed inset-0 -z-10 will-change-transform" />
        <BackgroundFlames />
        <SmoothScroll>
          <IntroProvider>{children}</IntroProvider>
        </SmoothScroll>
        <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[90] hidden opacity-[0.035] md:block" />
      </body>
    </html>
  );
}
