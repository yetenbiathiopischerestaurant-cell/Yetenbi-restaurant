import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";
import { getBusiness } from "@/lib/server/business";

export const metadata: Metadata = { title: "Datenschutz für das Team", robots: { index: false } };

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="pt-6 font-display text-2xl font-semibold text-gold-soft">{children}</h2>
);

/*
  Privacy notice for staff (Art. 13 DSGVO): what the website stores about the people who work with it
  (owners, kitchen, drivers). Linked from the kitchen and delivery screens and /admin/team.
*/
export default async function TeamDatenschutz() {
  const business = await getBusiness();
  return (
    <LegalPage title="Datenschutz für das Team">
      <p>
        Diese Hinweise gelten für alle, die mit einem Team-Zugang (Inhaber/in, Küche, Fahrer/in) mit der Website
        arbeiten. Für Gäste gilt die allgemeine Datenschutzerklärung.
      </p>
      <p className="text-sm text-cream/60">Stand: Oktober 2026</p>

      <H>1. Verantwortlich</H>
      <p>
        Yetenbi Äthiopisches Restaurant & Café, Inhaber/in: <strong>{business.ownerName || "[wird ergänzt]"}</strong>,{" "}
        {restaurant.street}, {restaurant.city}, Telefon {restaurant.phone}
        {business.contactEmail && <>, E-Mail {business.contactEmail}</>}
      </p>

      <H>2. Welche Daten gespeichert werden</H>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Zugang:</strong> Name, E-Mail-Adresse, Rolle, Sprache und Ihr Passwort (nur als sicherer Hash), bei
          Anmeldung mit Google zusätzlich eine Kennung Ihres Google-Kontos. Anmeldungen werden über ein Sitzungs-Cookie
          (30 Tage) gehalten.
        </li>
        <li>
          <strong>Arbeitsschritte bei Bestellungen:</strong> wann eine Bestellung angenommen, gekocht, verpackt,
          übergeben und zugestellt wurde und welcher Fahrerin oder welchem Fahrer sie übergeben wurde. Diese Angaben
          gehören zur Bestellung und werden mit ihr nach 180 Tagen gelöscht.
        </li>
        <li>
          <strong>Protokoll:</strong> was in der Verwaltung getan wurde (z. B. „Bestellung angenommen“, „Angemeldet“)
          mit Zeitpunkt, Name und Rolle. Es wird nach einem Jahr gelöscht.
        </li>
        <li>
          <strong>E-Mails:</strong> die Küche erhält angenommene Bestellungen (nur Speisen), Fahrer/innen ihre
          Lieferungen.
        </li>
        <li>
          <strong>Auf Ihrem Gerät:</strong> ob Benachrichtigungstöne eingeschaltet sind (localStorage) und, wenn Sie es
          erlauben, Browser-Benachrichtigungen. Beides können Sie im Browser jederzeit löschen bzw. widerrufen.
        </li>
      </ul>
      <p>
        Es werden keine Standorte, Arbeitszeiten oder Leistungskennzahlen einzelner Personen erfasst oder ausgewertet.
      </p>

      <H>3. Zweck und Rechtsgrundlage</H>
      <p>
        Der Zugang und die Arbeitsschritte sind nötig, damit Sie Bestellungen und Reservierungen bearbeiten können (Art.
        6 Abs. 1 lit. b DSGVO, Durchführung des Beschäftigungsverhältnisses). Das Protokoll dient dazu, Fehler
        und Missbrauch nachvollziehen zu können (Art. 6 Abs. 1 lit. f DSGVO); es wird nicht zur Leistungs- oder
        Verhaltenskontrolle verwendet. Sehen können es nur die Inhaber/innen.
      </p>

      <H>4. Dienstleister</H>
      <p>
        Die Daten liegen bei denselben Dienstleistern wie die Gästedaten (Vercel, Neon in Frankfurt, E-Mail-Versand);
        Details stehen in Abschnitt 2 der{" "}
        <a href="/datenschutz" className="text-gold-soft underline underline-offset-4">
          Datenschutzerklärung
        </a>
        .
      </p>

      <H>5. Löschung</H>
      <p>
        Endet Ihre Tätigkeit, entfernt die Inhaberin oder der Inhaber Ihren Team-Zugang. Er wird dann zu einem normalen
        Gastkonto, das Sie im Profil selbst löschen können; auf Wunsch löschen wir es für Sie. Protokolleinträge bleiben
        bis zum Ablauf ihres Jahres mit Ihrem Namen erhalten.
      </p>

      <H>6. Ihre Rechte</H>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch
        (Art. 15–21 DSGVO). Wenden Sie sich dazu an die Inhaberin oder den Inhaber. Sie können sich außerdem beim
        Bayerischen Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach, beschweren.
      </p>
    </LegalPage>
  );
}
