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
      {/* Registration under § 14 GewO is a notification, not a permit. The former "Berufsbezeichnung" section was
          removed: it applies only to regulated professions (with a chamber), not to a restaurant. */}
      <p>
        Gewerbe angemeldet nach § 14 der Gewerbeordnung (GewO) am 14.04.2026 bei der Stadt Würzburg, Ordnungsamt.
        <br />
        Zuständige Aufsichtsbehörde: Stadt Würzburg, Ordnungsamt
      </p>
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">
        Verbraucherstreitbeilegung/
        <wbr />
        Universalschlichtungsstelle
      </h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">Verantwortlich für den Inhalt</h2>
      <p>
        nach § 18 Abs. 2 MStV: {business.ownerName || "[Name wird ergänzt]"}, {restaurant.street}, {restaurant.city}
      </p>
      <h2 className="pt-4 font-display text-xl font-semibold text-gold-soft">Werbe-E-Mails</h2>
      <p>
        Der Nutzung der hier veröffentlichten Kontaktdaten zur Zusendung von nicht ausdrücklich angeforderter Werbung
        und Informationsmaterialien wird hiermit widersprochen.
      </p>
      <p className="pt-4 text-sm text-cream/60">
        Fotos: Unsplash (Unsplash-Lizenz). Gestaltung und Umsetzung der Website: im Auftrag von Yetenbi.
      </p>
    </LegalPage>
  );
}
