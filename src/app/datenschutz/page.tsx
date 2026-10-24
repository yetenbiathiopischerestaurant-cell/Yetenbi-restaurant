import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";
import { getBusiness } from "@/lib/server/business";

export const metadata: Metadata = { title: "Datenschutz" };

/*
  Privacy policy (DSGVO Art. 13/14), German with an English version below.
  The owner's name and email come from /admin → Betrieb & Rechtliches. The email provider follows the configuration:
  with SMTP_HOST and MAIL_PROVIDER set (e.g. "Brevo, Sendinblue SAS, Frankreich") it is named instead of Gmail.
  Keep both languages in step, and have the text checked before relying on it.
*/

const H = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 pt-6 font-display text-2xl font-semibold text-gold-soft">
    {children}
  </h2>
);
const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-3 border-l-2 border-gold/60 bg-gold/5 px-5 py-4">{children}</div>
);
const Table = ({ rows }: { rows: [string, string][] }) => (
  <table className="w-full border-collapse text-sm">
    <tbody>
      {rows.map(([what, how]) => (
        <tr key={what} className="border-b border-gold/15 align-top">
          <td className="py-2 pr-4 text-cream">{what}</td>
          <td className="py-2">{how}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

type Owner = { name: string; email: string };

/** The mail service named in the policy: another provider once SMTP_HOST and MAIL_PROVIDER are set, else Gmail. */
const otherMail = process.env.SMTP_HOST && process.env.MAIL_PROVIDER ? process.env.MAIL_PROVIDER.trim() : "";

export default async function Datenschutz() {
  const business = await getBusiness();
  const owner = { name: business.ownerName, email: business.contactEmail };
  return (
    <LegalPage title="Datenschutz">
      <p>
        <a href="#english" className="text-gold-soft underline underline-offset-4">
          English version below
        </a>
      </p>
      <German owner={owner} />
      <hr className="my-16 border-gold/30" />
      <English owner={owner} />
    </LegalPage>
  );
}

function Controller({
  owner,
  ownerLabel,
  emailLabel,
  phoneLabel,
  missing,
}: {
  owner: Owner;
  ownerLabel: string;
  emailLabel: string;
  phoneLabel: string;
  missing: string;
}) {
  return (
    <p>
      Yetenbi Äthiopisches Restaurant & Café, {ownerLabel}: <strong>{owner.name || missing}</strong>
      <br />
      {restaurant.street}, {restaurant.city}
      <br />
      {phoneLabel}: {restaurant.phone}
      <br />
      {emailLabel}:{" "}
      {owner.email ? (
        <a href={`mailto:${owner.email}`} className="text-gold-soft underline underline-offset-4">
          {owner.email}
        </a>
      ) : (
        missing
      )}
    </p>
  );
}

function German({ owner }: { owner: Owner }) {
  return (
    <>
      <p>
        Wir freuen uns über Ihren Besuch. Hier erklären wir, welche Daten diese Website verarbeitet, wofür, wie lange
        und wer sie erhält.
      </p>
      <p className="text-sm text-cream/60">Stand: Oktober 2026</p>

      <H>1. Verantwortlicher</H>
      <Controller
        owner={owner}
        ownerLabel="Inhaber/in"
        emailLabel="E-Mail"
        phoneLabel="Telefon"
        missing="[wird ergänzt]"
      />
      <p>
        Einen Datenschutzbeauftragten müssen wir nicht benennen. Für alle Fragen zum Datenschutz erreichen Sie uns unter
        den oben genannten Kontaktdaten.
      </p>

      <H>2. Dienstleister und Übermittlungen in Drittländer</H>
      <p>Wir setzen folgende Dienstleister ein, die Daten in unserem Auftrag verarbeiten (Art. 28 DSGVO):</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Vercel Inc.</strong> (USA) – Hosting der Website. Die Programme, die Ihre Eingaben verarbeiten, laufen
          in Frankfurt am Main; Bilder und Seitendateien werden über ein weltweites Netz ausgeliefert. Vercel ist nach
          dem EU-US Data Privacy Framework (DPF) zertifiziert; zusätzlich gelten Standardvertragsklauseln.
        </li>
        <li>
          <strong>Neon Inc.</strong> (USA) – Datenbank. Die Daten liegen auf Servern in Frankfurt am Main. Da Neon ein
          US-Unternehmen ist, ist ein Zugriff aus den USA nicht ausgeschlossen; er ist durch Standardvertragsklauseln
          (Art. 46 DSGVO) abgesichert.
        </li>
        {otherMail ? (
          <li>
            <strong>{otherMail}</strong> – Versand unserer E-Mails (siehe Abschnitt 9).
          </li>
        ) : (
          <li>
            <strong>Google</strong> (Gmail) – Versand unserer E-Mails (siehe Abschnitt 9). Dabei können Daten in die USA
            übertragen werden; Google LLC ist nach dem DPF zertifiziert.
          </li>
        )}
        <li>
          <strong>Cloudinary Ltd.</strong> (Israel) – Fotos, die das Restaurant hochlädt (siehe Abschnitt 10).
        </li>
      </ul>
      <p>Darüber hinaus geben wir Ihre Daten nicht weiter und verkaufen sie nicht.</p>

      <H>3. Aufruf der Website und Server-Protokolle</H>
      <p>
        Beim Aufruf werden technisch notwendige Daten verarbeitet (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite,
        Browser), um die Seite auszuliefern und vor Angriffen zu schützen (Art. 6 Abs. 1 lit. f DSGVO). Diese Protokolle
        speichert Vercel nur kurzzeitig (höchstens wenige Tage).
      </p>
      <p>
        Alle Seiten werden verschlüsselt übertragen (TLS, erkennbar an „https://“ und dem Schloss-Symbol im Browser),
        damit Dritte Ihre Eingaben nicht mitlesen können.
      </p>

      <H>4. Tischreservierung</H>
      <p>
        Zum Reservieren über die Website ist ein Kundenkonto mit bestätigter E-Mail-Adresse nötig (Abschnitt 7); die
        Bestätigung geht an die Adresse Ihres Kontos. Wenn Sie einen Tisch anfragen, verarbeiten wir Name,
        E-Mail-Adresse, Telefonnummer, Datum, Uhrzeit, Personenzahl und Ihre optionale Anmerkung, um die Reservierung
        durchzuführen und Sie zu kontaktieren (Art. 6 Abs. 1 lit. b DSGVO). Name, E-Mail-Adresse und Telefonnummer sind
        erforderlich; ohne sie können wir die Reservierung nicht bestätigen. Reservierungen, die Sie telefonisch
        durchgeben, trägt das Team ebenso ein. Reservierungen werden 180 Tage nach dem Reservierungsdatum automatisch
        gelöscht.
      </p>
      <p>
        Ist die Online-Reservierung vorübergehend nicht verfügbar, öffnet das Formular stattdessen WhatsApp mit einer
        vorbereiteten Nachricht. Die Übermittlung erfolgt erst, wenn Sie die Nachricht selbst absenden, und unterliegt
        dann den Bedingungen von WhatsApp (Meta).
      </p>
      <p>
        Im Restaurant können Sie Ihre Rechnung über einen QR-Code auf Ihr Handy holen. Die Rechnung enthält nur Tisch,
        Rechnungsnummer, Speisen, Beträge mit Trinkgeld, Zahlungsart und Uhrzeit, keine Angaben zu Ihrer Person; der
        Link ist ein zufälliger, nicht erratbarer Code. Beim Aufruf fallen nur die Server-Protokolle aus Abschnitt 3 an.
      </p>
      <p>
        Bestellungen am Tisch nimmt das Team mit unserem internen Bestellsystem auf: Tisch, Speisen, Ihre Wünsche dazu
        und gegebenenfalls die Platznummer, aber nicht Ihren Namen. Die bezahlte Rechnung (mit dem Namen der Bedienung)
        bewahren wir wegen der steuerlichen Aufbewahrungspflicht (§ 147 AO, Art. 6 Abs. 1 lit. c DSGVO) zehn Jahre auf
        und löschen sie danach automatisch.
      </p>

      <H>5. Online-Bestellungen</H>
      <p>
        Zum Bestellen ist ein Kundenkonto nötig. Wir verarbeiten Name, Telefonnummer, die E-Mail-Adresse Ihres Kontos,
        bei Lieferung Ihre Adresse und Ihren Hinweis für den Fahrer, die bestellten Speisen, Zahlungsart und Wunschzeit,
        um die Bestellung zuzubereiten, zu liefern und Sie bei jedem Schritt per E-Mail zu informieren (Art. 6 Abs. 1
        lit. b DSGVO). Diese Angaben (außer den Hinweisen) sind erforderlich; ohne sie können wir nicht liefern.
      </p>
      <p>
        Im Team sieht die Küche nur die Speisen und Ihre Anmerkung, die Fahrerin oder der Fahrer nur die eigenen
        Lieferungen mit Name, Adresse, Telefonnummer und Betrag. Bezahlt wird bei Übergabe; Zahlungsdaten verarbeiten
        wir auf der Website nicht. Bestellungen werden 180 Tage nach der Bestellung gelöscht; für die Buchhaltung
        aufbewahrungspflichtige Belege (§ 147 AO) führen wir in unserer Kasse. Der Warenkorb wird bis zur Bestellung nur
        in Ihrem Browser gespeichert.
      </p>
      <p>
        Bitte tragen Sie in die Anmerkungsfelder keine Angaben zu Allergien oder Ihrer Gesundheit ein; Fragen zu
        Allergenen klären wir gern telefonisch. Tun Sie es dennoch, verwenden wir die Angabe nur für Ihre Bestellung
        (Art. 9 Abs. 2 lit. a DSGVO) und löschen sie mit ihr.
      </p>

      <H>6. Schutz vor Missbrauch</H>
      <p>
        Zum Schutz vor Scherz- und Massenbestellungen speichern wir zu jeder Bestellung einen pseudonymisierten Kennwert
        (Hash) Ihrer IP-Adresse, nicht die IP-Adresse selbst, und begrenzen damit die Zahl der Bestellungen je Gerät und
        Telefonnummer. Der Kennwert wird nach 30 Tagen gelöscht. Sehr große erste Bestellungen nehmen wir nur
        telefonisch an. Nach einer Scherzbestellung kann das Team Telefonnummer, E-Mail-Adresse und diesen Kennwert für
        Online-Bestellungen sperren; die Sperre wird nach spätestens einem Jahr gelöscht.
      </p>
      <p>
        Um Passwort-Rateversuche und massenhafte Anmeldungen, Reservierungen und E-Mails zu verhindern, zählen wir
        Versuche je E-Mail-Adresse und je pseudonymisiertem Kennwert Ihrer IP-Adresse. Diese Einträge werden nach einem
        Tag gelöscht.
      </p>
      <p>
        Rechtsgrundlage ist jeweils Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Sicherheit der Website,
        Ihres Kontos und unseres Betriebs). Die Grenzen werden automatisch angewendet; über jede Bestellung entscheidet
        aber ein Mensch im Team. Eine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO findet nicht statt.
      </p>

      <H>7. Kundenkonto und Anmeldung mit Google</H>
      <p>
        Wenn Sie ein Konto anlegen, speichern wir Name, E-Mail-Adresse, optional Telefonnummer und Ihre bevorzugte
        Sprache (Art. 6 Abs. 1 lit. b DSGVO). Ihr Passwort wird ausschließlich als sicherer Hash gespeichert. Damit
        niemand mit fremder Adresse bestellt, senden wir nach der Anmeldung einen Bestätigungslink (24 Stunden gültig);
        erst danach sind Reservieren und Bestellen möglich. Das Konto bleibt bestehen, bis Sie es löschen. Im Profil
        können Sie Ihre Daten jederzeit ändern, herunterladen oder das Konto löschen. Beim Löschen entfernen wir auch
        unsere Notizen zu Ihnen (Abschnitt 8); Ihre Bestellungen und Reservierungen bleiben ohne Verknüpfung zum Konto
        bis zum Ablauf ihrer Frist (180 Tage) gespeichert.
      </p>
      <p>
        Bei der „Anmeldung mit Google“ erhalten wir von Google Ihren Namen, Ihre E-Mail-Adresse und eine Kennung Ihres
        Google-Kontos (Art. 6 Abs. 1 lit. b DSGVO). Für die Anmeldung selbst ist Google Ireland Ltd. verantwortlich; es
        gelten deren Datenschutzbestimmungen.
      </p>

      <H>8. Kundenübersicht und Notizen des Teams</H>
      <p>
        Die Inhaber/innen sehen eine Übersicht je Gast aus den ohnehin gespeicherten Bestellungen, Reservierungen und
        Konten (Anzahl, Umsatz, abgelehnte Bestellungen) und können eine kurze Notiz hinterlegen, z. B. „bevorzugt
        Fensterplatz“. Das dient der Betreuung unserer Gäste und dem Schutz vor Scherzbestellungen (Art. 6 Abs. 1 lit. f
        DSGVO). Die Notiz ist in Ihrem Datenexport enthalten, wird mit Ihrem Konto gelöscht und automatisch, sobald
        keine Bestellung, Reservierung oder Konto von Ihnen mehr gespeichert ist.
      </p>
      <p>
        Was das Team in der Verwaltung tut (z. B. Bestellung angenommen, Reservierung bestätigt), wird mit Zeitpunkt und
        Bestell- oder Reservierungsnummer protokolliert, um Fehler nachvollziehen zu können (Art. 6 Abs. 1 lit. f
        DSGVO). Das Protokoll wird nach einem Jahr gelöscht.
      </p>

      <H>9. E-Mails</H>
      <p>
        Bestätigungen und Statusmeldungen versenden wir über{" "}
        {otherMail ? `den E-Mail-Dienst ${otherMail}` : "ein Google-Postfach (Gmail)"}. Damit wir Reservierungen und
        Bestellungen bearbeiten können, erhalten auch das Restaurant, bei Bestellungen die Küche (nur die Speisen) und
        die zuständige Fahrerin oder der zuständige Fahrer (Name, Adresse, Telefonnummer, Betrag) eine E-Mail. Kopien
        dieser E-Mails in unseren Postfächern löschen wir spätestens nach 180 Tagen.
      </p>

      <H>10. Fotos (Cloudinary)</H>
      <p>
        Fotos, die das Restaurant selbst hochlädt, werden beim Bilddienst Cloudinary (Cloudinary Ltd., Israel, mit
        Servern u. a. in der EU und den USA) gespeichert. Ausgeliefert werden sie über unseren eigenen Server: Ihr
        Browser verbindet sich dabei nicht mit Cloudinary, und Ihre IP-Adresse wird nicht an Cloudinary übertragen. Die
        Fotos zeigen Speisen und das Restaurant, keine Gäste. Für Israel besteht ein Angemessenheitsbeschluss der
        EU-Kommission; Übermittlungen in die USA erfolgen auf Grundlage des DPF bzw. von Standardvertragsklauseln.
      </p>

      <H>11. Karte</H>
      <p>
        Die Karte im Bereich „Anfahrt“ wird vollständig von unserem eigenen Server geladen. Sie beruht auf Kartendaten
        von OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL), die wir einmalig heruntergeladen haben. Beim Anzeigen der
        Karte werden daher keine Daten an Google, OpenStreetMap oder andere Dritte übertragen und keine Cookies gesetzt.
        Erst der Link „Route planen“ öffnet Google Maps in einem neuen Fenster; dort gelten die Datenschutzbestimmungen
        von Google.
      </p>

      <H id="cookies">12. Schriften, Cookies und lokale Speicherung</H>
      <p>
        Schriften werden von unserem eigenen Server geladen, nicht von Google. Wir setzen keine Analyse- oder
        Werbe-Cookies und keine Tracking-Dienste, daher gibt es nichts, dem Sie zustimmen müssten, und kein
        Cookie-Banner. Ihre Sprachwahl, Ihr Warenkorb und der Vermerk, dass Sie das Eingangs-Intro schon gesehen haben
        (damit es nicht bei jedem Besuch erneut abläuft), werden nur in Ihrem Browser gespeichert (localStorage), und
        erst, wenn Sie eine Sprache wählen, etwas in den Warenkorb legen bzw. das Intro einmal gesehen haben. Wenn Sie
        sich anmelden, setzen wir ein Sitzungs-Cookie (30 Tage); bei der Anmeldung mit Google zusätzlich für höchstens
        10 Minuten ein Cookie zur Absicherung des Anmeldevorgangs. Diese Speicherungen sind für die von Ihnen
        gewünschten Funktionen unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Unter „Cookie-Einstellungen“ (unten auf
        jeder Seite) sehen Sie, was davon in Ihrem Browser gerade gespeichert ist, und können es löschen oder sich
        abmelden.
      </p>

      <H>13. Speicherdauer auf einen Blick</H>
      <Table
        rows={[
          ["Reservierungen", "180 Tage nach dem Reservierungsdatum"],
          ["Rechnungen aus dem Restaurant", "10 Jahre (§ 147 AO)"],
          ["Bestellungen", "180 Tage nach der Bestellung"],
          ["Kundenkonto", "bis Sie es löschen"],
          ["Notiz des Teams", "mit dem Konto bzw. sobald nichts anderes mehr von Ihnen gespeichert ist"],
          ["IP-Kennwert zu Bestellungen", "30 Tage"],
          ["Sperren nach Scherzbestellungen", "1 Jahr"],
          ["Zähler gegen Rateversuche", "1 Tag"],
          ["Team-Protokoll", "1 Jahr"],
          ["E-Mail-Kopien in unseren Postfächern", "höchstens 180 Tage"],
          ["Sitzungs-Cookie / Link „Passwort vergessen“", "30 Tage / 1 Stunde"],
          ["Bestätigungslink für die E-Mail-Adresse", "24 Stunden"],
          ["Server-Protokolle bei Vercel", "wenige Tage"],
        ]}
      />
      <p>Gesetzliche Aufbewahrungspflichten (z. B. § 147 AO für Buchungsbelege) bleiben unberührt.</p>

      <H>14. Ihre Rechte</H>
      <p>
        Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
        Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20 DSGVO) sowie das Recht, eine erteilte Einwilligung
        jederzeit mit Wirkung für die Zukunft zu widerrufen. Mit Konto können Sie Ihre Daten im Profil selbst
        herunterladen, ändern und löschen; im Übrigen wenden Sie sich an die oben genannten Kontaktdaten.
      </p>
      <Box>
        <p className="font-semibold text-cream">Widerspruchsrecht (Art. 21 DSGVO)</p>
        <p>
          Soweit wir Daten auf Grundlage berechtigter Interessen verarbeiten (Art. 6 Abs. 1 lit. f DSGVO, Abschnitte 3,
          6 und 8), können Sie dieser Verarbeitung aus Gründen, die sich aus Ihrer besonderen Situation ergeben,
          jederzeit widersprechen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende
          schutzwürdige Gründe nachweisen, die Ihre Interessen überwiegen, oder die Verarbeitung dient der
          Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
        </p>
      </Box>
      <p>
        Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Bayerischen Landesamt für
        Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.
      </p>
    </>
  );
}

function English({ owner }: { owner: Owner }) {
  return (
    <div lang="en" className="space-y-4">
      <h1 id="english" className="scroll-mt-24 font-display text-4xl font-semibold text-cream md:text-5xl">
        Privacy policy
      </h1>
      <p className="text-sm text-cream/60">
        Translation for convenience; the German version above is authoritative. As of October 2026.
      </p>

      <H>1. Controller</H>
      <Controller owner={owner} ownerLabel="Owner" emailLabel="Email" phoneLabel="Phone" missing="[to be added]" />
      <p>
        We are not required to appoint a data protection officer. Contact us at the details above with any privacy
        question.
      </p>

      <H>2. Service providers and transfers outside the EU</H>
      <p>We use these processors (Art. 28 GDPR):</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Vercel Inc.</strong> (USA) – website hosting. The code that handles your input runs in Frankfurt am
          Main; images and page files are delivered through a worldwide network. Vercel is certified under the EU-US
          Data Privacy Framework (DPF); standard contractual clauses also apply.
        </li>
        <li>
          <strong>Neon Inc.</strong> (USA) – database, stored on servers in Frankfurt am Main. As Neon is a US company,
          access from the USA cannot be ruled out; it is covered by standard contractual clauses (Art. 46 GDPR).
        </li>
        {otherMail ? (
          <li>
            <strong>{otherMail}</strong> – sending our emails (section 9).
          </li>
        ) : (
          <li>
            <strong>Google</strong> (Gmail) – sending our emails (section 9). Data may be transferred to the USA; Google
            LLC is DPF-certified.
          </li>
        )}
        <li>
          <strong>Cloudinary Ltd.</strong> (Israel) – photos uploaded by the restaurant (section 10).
        </li>
      </ul>
      <p>We do not pass your data on to anyone else and never sell it.</p>

      <H>3. Visiting the website and server logs</H>
      <p>
        When you visit, technically necessary data (IP address, date and time, page, browser) is processed to deliver
        the site and protect it from attacks (Art. 6(1)(f) GDPR). Vercel keeps these logs only briefly (a few days at
        most).
      </p>
      <p>
        Every page is sent encrypted (TLS, shown by &quot;https://&quot; and the lock symbol in your browser), so others
        cannot read what you enter.
      </p>

      <H>4. Table reservations</H>
      <p>
        Booking online requires an account with a confirmed email address (section 7); the confirmation goes to your
        account&apos;s address. When you request a table we process your name, email, phone number, date, time, party
        size and optional note to handle the booking and contact you (Art. 6(1)(b) GDPR). Name, email and phone are
        required; without them we cannot confirm the booking. Bookings made by phone are entered by the team in the same
        way. Reservations are deleted automatically 180 days after the reservation date.
      </p>
      <p>
        If online booking is temporarily unavailable, the form opens WhatsApp with a prepared message instead. Nothing
        is sent until you send it yourself; WhatsApp&apos;s (Meta&apos;s) terms then apply.
      </p>
      <p>
        In the restaurant you can get your bill on your phone through a QR code. The bill shows only the table, bill
        number, dishes, amounts including tip, payment method and time, nothing about you; the link is a random code
        that cannot be guessed. Opening it only creates the server logs described in section 3.
      </p>
      <p>
        At the table, the team takes orders with our internal ordering system: table, dishes, your wishes and, if
        needed, the seat number, but not your name. We keep the paid bill (with the name of the staff member who served)
        for ten years because tax law requires it (§ 147 AO, Art. 6(1)(c) GDPR) and then delete it automatically.
      </p>

      <H>5. Online orders</H>
      <p>
        Ordering requires an account. We process your name, phone number, your account email, for delivery your address
        and note for the driver, the dishes, payment method and requested time, to prepare and deliver the order and
        email you at each step (Art. 6(1)(b) GDPR). These details (except the notes) are required; without them we
        cannot deliver.
      </p>
      <p>
        Within the team, the kitchen sees only the dishes and your note; the driver sees only their own deliveries with
        name, address, phone and amount. You pay on handover; we process no payment data on the website. Orders are
        deleted 180 days after ordering; records we must keep for tax purposes (§ 147 AO) are kept in our till system.
        Your basket is stored only in your browser until you order.
      </p>
      <p>
        Please don&apos;t enter allergies or health details in the note fields; call us with any questions about
        allergens. If you do, we use the information only for your order (Art. 9(2)(a) GDPR) and delete it with the
        order.
      </p>

      <H>6. Protection against misuse</H>
      <p>
        To protect against prank and mass orders, we store a pseudonymised value (hash) of your IP address with each
        order, never the address itself, and limit orders per device and phone number. The value is deleted after 30
        days. Very large first orders are taken by phone only. After a prank order the team can block the phone number,
        email address and this value from ordering online; blocks are deleted after one year at the latest.
      </p>
      <p>
        To stop password guessing and mass sign-ups, bookings and emails, we count attempts per email address and per
        pseudonymised IP value. These entries are deleted after one day.
      </p>
      <p>
        The legal basis is Art. 6(1)(f) GDPR (legitimate interest in the security of the site, your account and our
        business). The limits apply automatically, but a person in the team decides on every order. There is no
        automated decision-making within the meaning of Art. 22 GDPR.
      </p>

      <H>7. Customer account and Google sign-in</H>
      <p>
        When you create an account we store your name, email, optional phone number and preferred language (Art. 6(1)(b)
        GDPR). Your password is stored only as a secure hash. So that nobody orders with someone else&apos;s address, we
        send a confirmation link after sign-up (valid 24 hours); booking and ordering are possible once it is confirmed.
        The account exists until you delete it. In your profile you can change, download or delete your data at any
        time. Deleting the account also removes our notes about you (section 8); your orders and reservations remain,
        unlinked from the account, until their period (180 days) ends.
      </p>
      <p>
        With &quot;Sign in with Google&quot; we receive your name, email and an identifier of your Google account from
        Google (Art. 6(1)(b) GDPR). Google Ireland Ltd. is responsible for the sign-in itself; its privacy policy
        applies.
      </p>

      <H>8. Guest overview and team notes</H>
      <p>
        The owners see an overview per guest built from the orders, reservations and accounts stored anyway (number,
        total spent, rejected orders) and can keep a short note, e.g. &quot;prefers a window table&quot;. This serves
        looking after our guests and protecting against prank orders (Art. 6(1)(f) GDPR). The note is included in your
        data download, deleted with your account, and deleted automatically once no order, reservation or account of
        yours is stored.
      </p>
      <p>
        What the team does in the admin area (e.g. order accepted, booking confirmed) is logged with the time and order
        or booking number so mistakes can be traced (Art. 6(1)(f) GDPR). The log is deleted after one year.
      </p>

      <H>9. Emails</H>
      <p>
        We send confirmations and status updates through{" "}
        {otherMail ? `the email service ${otherMail}` : "a Google mailbox (Gmail)"}. To handle bookings and orders, the
        restaurant, for orders the kitchen (dishes only) and the assigned driver (name, address, phone, amount) also
        receive an email. Copies of these emails in our mailboxes are deleted after 180 days at the latest.
      </p>

      <H>10. Photos (Cloudinary)</H>
      <p>
        Photos uploaded by the restaurant are stored by Cloudinary Ltd. (Israel, with servers in the EU and the USA
        among others) and delivered through our own server: your browser does not connect to Cloudinary and your IP
        address is not sent to it. The photos show food and the restaurant, not guests. Israel has an EU adequacy
        decision; transfers to the USA rely on the DPF or standard contractual clauses.
      </p>

      <H>11. Map</H>
      <p>
        The map under &quot;Getting here&quot; is loaded entirely from our own server. It is based on map data from
        OpenStreetMap (© OpenStreetMap contributors, ODbL) that we downloaded once. Showing it therefore sends no data
        to Google, OpenStreetMap or anyone else and sets no cookies. Only the &quot;Plan route&quot; link opens Google
        Maps in a new window, where Google&apos;s privacy policy applies.
      </p>

      <H id="cookies-en">12. Fonts, cookies and local storage</H>
      <p>
        Fonts are loaded from our own server, not from Google. We use no analytics or advertising cookies and no
        tracking, so there is nothing to agree to and no cookie banner. Your language choice, your basket and a note
        that you have already seen the opening intro (so it doesn&apos;t play on every visit) are stored only in your
        browser (localStorage), and only once you choose a language, add something to the basket or have seen the intro
        once. When you sign in we set a session cookie (30 days), and for Google sign-in an additional cookie for at
        most 10 minutes to secure the sign-in. These are strictly necessary for the functions you request (§ 25(2) no. 2
        TDDDG). Under &quot;Cookie settings&quot; (at the bottom of every page) you can see which of these are stored in
        your browser right now, delete them or sign out.
      </p>

      <H>13. Retention at a glance</H>
      <Table
        rows={[
          ["Reservations", "180 days after the reservation date"],
          ["Bills from the restaurant", "10 years (§ 147 AO)"],
          ["Orders", "180 days after ordering"],
          ["Customer account", "until you delete it"],
          ["Team note", "with the account, or once nothing else of yours is stored"],
          ["IP value with orders", "30 days"],
          ["Blocks after prank orders", "1 year"],
          ["Attempt counters", "1 day"],
          ["Team log", "1 year"],
          ["Email copies in our mailboxes", "180 days at most"],
          ["Session cookie / password reset link", "30 days / 1 hour"],
          ["Email confirmation link", "24 hours"],
          ["Server logs at Vercel", "a few days"],
        ]}
      />
      <p>Statutory retention duties (e.g. § 147 AO for accounting records) remain unaffected.</p>

      <H>14. Your rights</H>
      <p>
        You have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18) and
        data portability (Art. 20 GDPR), and may withdraw any consent at any time with effect for the future. With an
        account you can download, change and delete your data in your profile; otherwise contact us at the details
        above.
      </p>
      <Box>
        <p className="font-semibold text-cream">Right to object (Art. 21 GDPR)</p>
        <p>
          Where we process data on the basis of legitimate interests (Art. 6(1)(f) GDPR, sections 3, 6 and 8), you may
          object at any time on grounds relating to your particular situation. We will then stop, unless we can
          demonstrate compelling legitimate grounds that override your interests, or the processing serves the
          establishment, exercise or defence of legal claims.
        </p>
      </Box>
      <p>
        You may also complain to a data protection authority, e.g. the Bavarian Data Protection Authority (BayLDA),
        Promenade 18, 91522 Ansbach, Germany.
      </p>
    </div>
  );
}
