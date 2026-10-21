import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";
import { getBusiness } from "@/lib/server/business";

export const metadata: Metadata = { title: "Impressum" };

// Owner, email and VAT ID come from /admin → Betrieb & Rechtliches (§ 5 DDG requires the name and an email address).
export default async function Impressum() {
  const business = await getBusiness();
  return (
    <LegalPage title="Impressum">
      <p className="font-display text-lg text-cream/80">Angaben gemäß § 5 DDG</p>
      <p>
        Yetenbi Äthiopisches Restaurant Würzburg
        <br />
        Inhaber/in: <strong>{business.ownerName || "[Name wird ergänzt]"}</strong>
        <br />
        {restaurant.street}
        <br />
        {restaurant.city}
      </p>
      <p>
        Telefon:{" "}
        <a href={restaurant.phoneHref} className="text-gold-soft underline underline-offset-4">
          {restaurant.phone}
        </a>
        <br />
        E-Mail:{" "}
        {business.contactEmail ? (
          <a href={`mailto:${business.contactEmail}`} className="text-gold-soft underline underline-offset-4">
            {business.contactEmail}
          </a>
        ) : (
          "[wird ergänzt]"
        )}
      </p>
      {business.vatId && <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: {business.vatId}</p>}
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">Gewerbeanmeldung</h2>
      <p>
        Die Gewerbeerlaubnis nach § 14 oder § 55c der Gewerbeordnung (GewO) wurde am 14.04.2026 von folgender Stelle
        erteilt: Ordnungsamt Würzburg.
      </p>
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">
        Berufsbezeichnung und berufsrechtliche Regelungen
      </h2>
      <p>
        Berufsbezeichnung: Fachkraft für Gastronomie
        <br />
        Zuständige Kammer: Caritas-Don Bosco GmbH
        <br />
        Verliehen in: Deutschland
      </p>
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">
        Verbraucherstreitbeilegung/Universalschlichtungsstelle
      </h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
      <p className="pt-4 text-sm text-cream/60">
        Fotos: Unsplash (Unsplash-Lizenz). Gestaltung und Umsetzung der Website: im Auftrag von Yetenbi.
      </p>
    </LegalPage>
  );
}
