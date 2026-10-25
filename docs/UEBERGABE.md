# Übergabe: Website und Service-App von Yetenbi

Stand: 25. Oktober 2026. Dieses Dokument ist für die Inhaberin bzw. den Inhaber und für jede Person, die die Technik
später betreut. Es enthält keine Passwörter, nur wo sie liegen.

## 1. Was es gibt

| Teil | Wo | Wofür |
| --- | --- | --- |
| Website | www.yetenbi-wu.de | Gäste: Speisekarte, Reservierung, Konto |
| Verwaltung | www.yetenbi-wu.de/admin | Reservierungen, Speisekarte, Fotos, Öffnungszeiten, Team, Berichte |
| Küchenbildschirm | www.yetenbi-wu.de/kueche | Tischbestellungen aus der App, „Ausverkauft“ |
| Service-App (Android) | auf den Handys/Tablets des Service | Tische, Bestellungen an die Küche, „Tisch schließen“ |

In der App wird **nicht kassiert** (Schalter `APP_PAYMENTS = false`). Kassiert wird an der Kasse: offene Ladenkasse mit
täglichem Kassenbericht und Kartenterminal. Mit der Steuerberatung bestätigen.

## 2. Konten – alle müssen auf die Inhaberin / den Inhaber laufen

| Dienst | Wofür | Prüfen |
| --- | --- | --- |
| **GitHub** – Repository `yetenbiathiopischerestaurant-cell/Yetenbi-restaurant` | der gesamte Programmcode, App-Dateien zum Herunterladen | Settings → Collaborators: nur Personen, die heute daran arbeiten |
| **Vercel** – Team „yetenbi“, Projekt `yetenbi-restaurant` | betreibt die Website; jede Änderung auf GitHub wird automatisch veröffentlicht | Team → Members; Settings → Environment Variables (siehe 3) |
| **Neon** – Projekt in Frankfurt | Datenbank (Reservierungen, Konten, Speisekarte, Tische) | Mitglieder; Passwort der Datenbank bei Personalwechsel neu erzeugen |
| **Google** – Gmail des Restaurants | E-Mails an Gäste (App-Passwort), „Mit Google anmelden“ (Google Cloud → OAuth-Client) | App-Passwörter, Google-Cloud-Projektmitglieder |
| **Cloudinary** | eigene Fotos der Website | Mitglieder |
| **Domain** yetenbi-wu.de | Adresse der Website | beim Domain-Anbieter, zeigt auf Vercel |

Noch offen bei den Konten: Vercel Pro (gewerbliche Nutzung, ca. 20 $/Monat) und die Auftragsverarbeitungsverträge (AVV)
bei Vercel, Neon, Cloudinary und Google Cloud im jeweiligen Konto annehmen.

## 3. Geheimnisse (Umgebungsvariablen)

Alle liegen in **Vercel → Projekt → Settings → Environment Variables**. Die Namen und ihre Bedeutung stehen in
`.env.example`. Wichtig sind: `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_*`, `CRON_SECRET`.

Wer die Technik abgibt, sollte danach neu erzeugt werden: das Datenbank-Passwort (Neon → Reset password, dann
`DATABASE_URL` in Vercel ersetzen), das Gmail-App-Passwort, `ADMIN_SESSION_SECRET` und `CRON_SECRET`. Danach in
Vercel einmal „Redeploy“. Gäste und Team müssen sich dadurch nicht neu registrieren.

## 4. Der Signaturschlüssel der App – unbedingt sichern

Jede neue Version der Service-App muss mit **demselben Schlüssel** signiert sein, sonst können die Handys sie nicht
installieren. Er besteht aus zwei Dateien im Ordner `.android-yetenbi` (im Benutzerordner des bisherigen
Entwicklungsrechners): `release.jks` und `keystore.properties` (enthält das Passwort).

- Beide Dateien an die Inhaberin / den Inhaber übergeben (USB-Stick oder verschlüsselt), nicht per normaler E-Mail.
- An zwei Orten sicher aufbewahren (z. B. Passwortmanager und USB-Stick im Büro).
- Ohne diesen Schlüssel: alle Handys müssen die App einmal deinstallieren und neu installieren.

## 5. Alltag

- **Speisekarte, Fotos, Öffnungszeiten, Schließtage, Team:** alles in /admin, keine Technik nötig.
- **Neue Bedienung:** /admin → Team & Zugänge → Konto anlegen, Rolle „Service“. Auf dem Handy mit dieser E-Mail
  anmelden. Für geteilte Geräte eine App-PIN setzen.
- **App auf ein neues Handy:** /admin → Service-App & Tische → „Version … herunterladen“ auf dem Gerät öffnen.
- **Sprache der Verwaltung:** Schalter DE/EN unten in der Seitenleiste.
- **Online-Bestellung / Lieferung** ist ausgeschaltet (`ONLINE_ORDERING = false` in `src/lib/features.ts`).

## 6. Für die nächste Entwicklerin / den nächsten Entwickler

- Aufbau und Regeln: `docs/ARCHITECTURE.md`, Einrichtung und Befehle: `README.md`,
  Datenschutz-Verzeichnis: `docs/verarbeitungsverzeichnis.md`.
- Ändern → auf GitHub `main` hochladen → Vercel veröffentlicht automatisch (ca. 1 Minute). Vorher prüfen:
  `npm run typecheck && npm run lint && npm run format:check && npm test`.
- Datenbankänderungen: neue Datei in `db/migrations`, dann `npm run db:migrate` **vor** dem Hochladen.
- Neue App-Version: `npm run app:release -- --name X.Y.Z --notes "…" --notes-en "…"` (braucht den Signaturschlüssel
  aus Abschnitt 4, ein Java 21 und das Android-SDK). Die Handys melden das Update selbst.
- Die lokale Datei `.env.local` zeigt auf die **echte** Datenbank. Für Versuche eine eigene Test-Datenbank verwenden.
- Es gibt zurzeit kein Test-Konto für die Verwaltung; für die automatischen Tests eines anlegen:
  `npm run owner:create -- test@… "Passwort" "Test"` und danach wieder löschen.

## 7. Aufräumen, sobald alle Handys App-Version 1.2.0 haben

Das alte Vercel-Projekt und die alte Datenbank aus der Entwicklungszeit liegen noch auf dem Konto der bisherigen
Betreuung. Ältere App-Versionen (vor 1.1.1) fragen dort nach Updates. Sobald kein Handy mehr eine solche Version hat,
werden beide gelöscht. Neue App-Versionen brauchen sie nicht (`OLD_DATABASE_URL` ist optional).
