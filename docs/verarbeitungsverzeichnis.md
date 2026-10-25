# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)

**Entwurf, Stand Oktober 2026.** Erstellt aus dem Code der Website. Die Inhaberin oder der Inhaber ergänzt die
markierten Stellen, prüft alles und hält das Verzeichnis aktuell, wenn sich etwas ändert. Verarbeitungen außerhalb der
Website (Kasse, Lohnabrechnung, Papierlisten) gehören ebenfalls hinein.

## Verantwortlicher

| | |
| --- | --- |
| Name | Yetenbi Äthiopisches Restaurant & Café, Inhaber/in: Sosina Kebede Alemayehu |
| Anschrift | Theaterstraße 6, 97070 Würzburg |
| Kontakt | yetenbiathiopischerestaurant@gmail.com, Telefon 0176 21438960 |
| Datenschutzbeauftragter | nicht erforderlich (weniger als 20 Personen ständig mit der Verarbeitung beschäftigt) |

## Auftragsverarbeiter und Empfänger

| Dienstleister | Zweck | Ort | Grundlage für Drittland | AVV |
| --- | --- | --- | --- | --- |
| Vercel Inc. | Hosting, Serverfunktionen | Funktionen Frankfurt (fra1), Auslieferung weltweit | DPF + SCC | **[abschließen]** |
| Neon Inc. | Datenbank | Frankfurt (AWS eu-central-1) | SCC | **[abschließen]** |
| E-Mail-Dienst | Versand an Gäste und Team | derzeit Gmail (privates Konto) | – | **nicht möglich → Anbieter wechseln** |
| Cloudinary Ltd. | Fotos des Restaurants (Auslieferung über die eigene Website, Besucher-IP geht nicht an Cloudinary) | Israel / EU / USA | Angemessenheit (IL), DPF/SCC | **[abschließen]** |
| GitHub Inc. | Ablage der Service-App zum Herunterladen | USA | DPF | eigene Verantwortlichkeit (nur IP beim Download) |
| Google Ireland Ltd. | Anmeldung mit Google, Karte (nach Klick) | EU / USA | eigene Verantwortlichkeit | – |

## Verarbeitungstätigkeiten

### 1. Tischreservierungen
- **Zweck:** Reservierungen annehmen, bestätigen, absagen; Gäste informieren. Online nur mit Kundenkonto und bestätigter E-Mail-Adresse (siehe 3); telefonische Reservierungen trägt das Team ein.
- **Betroffene / Daten:** Gäste – Name, E-Mail, Telefon, Datum, Uhrzeit, Personenzahl, Anmerkung, Sprache, Status, Notiz des Teams.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Inhaber/innen (/admin), E-Mail-Dienst, Postfach des Restaurants.
- **Löschung:** automatisch 180 Tage nach dem Reservierungsdatum; E-Mail-Kopien in den Postfächern spätestens nach 180 Tagen (**Routine einrichten**).

### 2. Online-Bestellungen
- **Zweck:** Bestellungen zubereiten, liefern, abholen lassen; Gäste über jeden Schritt informieren.
- **Betroffene / Daten:** Gäste – Name, Telefon, E-Mail, Lieferadresse, Hinweise, Speisen, Beträge, Zahlungsart, Zeiten, Status; Team – wer welchen Schritt gemacht hat, zuständige/r Fahrer/in.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Gesundheitsangaben in Anmerkungen nur ausnahmsweise (Art. 9 Abs. 2 lit. a), Gäste werden gebeten, keine einzutragen.
- **Empfänger:** Inhaber/innen; Küche (nur Speisen und Anmerkung); zuständige/r Fahrer/in (Name, Adresse, Telefon, Betrag); E-Mail-Dienst.
- **Löschung:** automatisch 180 Tage nach der Bestellung. Aufbewahrungspflichtige Belege (§ 147 AO) liegen in der Kasse (**prüfen**). Rechnungen aus der Service-App: siehe 8.

### 3. Kundenkonten
- **Zweck:** Anmeldung, Profil, eigene Reservierungen und Bestellungen, Datenexport, Kontolöschung.
- **Daten:** Name, E-Mail, Telefon (optional), Sprache, Passwort-Hash, ggf. Google-Kennung, Sitzungen (Hash), Links zum Zurücksetzen (Hash, 1 Stunde).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Cookies nach § 25 Abs. 2 Nr. 2 TDDDG.
- **Löschung:** bis der Gast das Konto löscht; Sitzungen nach 30 Tagen.

### 4. Missbrauchsschutz
- **Zweck:** Scherz- und Massenbestellungen, Passwort-Rateversuche und Spam verhindern.
- **Daten:** Schlüssel-Hash der IP-Adresse, Telefonnummer (normalisiert), E-Mail, Sperrgrund, Zählerstände.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Löschung:** IP-Hash 30 Tage, Sperren 1 Jahr, Zähler 1 Tag (automatisch).

### 5. Kundenübersicht und Notizen
- **Zweck:** Gäste betreuen, Scherzbestellungen erkennen.
- **Daten:** Zusammenfassung aus 1–3 (Anzahl, Umsatz, abgelehnte Bestellungen), freie Notiz des Teams (keine Gesundheitsdaten).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Empfänger:** nur Inhaber/innen.
- **Löschung:** mit dem Konto; automatisch, sobald nichts anderes mehr über den Gast gespeichert ist.

### 6. Team-Zugänge und Protokoll
- **Zweck:** Arbeit in Verwaltung, Küche und Lieferung; Fehler nachvollziehen.
- **Betroffene / Daten:** Beschäftigte – Name, E-Mail, Rolle, Passwort-Hash, PIN-Hash (Service-App), Anmeldeschlüssel der App (Hash, 30 Tage), Protokolleinträge (Zeit, Handlung, Ziel).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Beschäftigungsverhältnis), Protokoll Art. 6 Abs. 1 lit. f.
- **Information:** /datenschutz/team.
- **Löschung:** Zugang bei Ende der Tätigkeit entfernen; Protokoll nach 1 Jahr automatisch.

### 7. Website-Aufruf
- **Zweck:** Auslieferung, Sicherheit.
- **Daten:** IP-Adresse, Zeit, Seite, Browser (Server-Protokolle bei Vercel).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Löschung:** nach wenigen Tagen durch Vercel.

### 8. Service-App: Bestellungen am Tisch und Rechnungen
- **Zweck:** Bestellungen am Tisch aufnehmen, an die Küche senden, Tisch schließen. Seit Oktober 2026 wird in der App nicht mehr kassiert (`APP_PAYMENTS = false`): keine Zahlungen, kein Trinkgeld, keine QR-Rechnung. Ältere bezahlte Rechnungen bleiben gespeichert.
- **Betroffene / Daten:** Gäste – Tisch, Speisen, Wünsche, Platznummer, Bestellwert (kein Name); bei älteren Rechnungen zusätzlich Beträge, Trinkgeld, Zahlungsart. Beschäftigte – Name der Bedienung an jeder Runde und beim Schließen, mit Zeitpunkt.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Bewirtung, Beschäftigungsverhältnis); Aufbewahrung Art. 6 Abs. 1 lit. c DSGVO mit § 147 AO.
- **Empfänger:** Inhaber/innen, Service, Küche (Küchenbildschirm mit Name der Bedienung); bei älteren Rechnungen der Gast über den zufälligen QR-Link.
- **Löschung:** geschlossene, bezahlte und stornierte Tische automatisch nach 10 Jahren.
- **Information:** Gäste /datenschutz (Abschnitt 4), Team /datenschutz/team.
- **Hinweis (außerhalb der DSGVO):** Die App erfasst keine Zahlungen mehr und ist damit keine elektronische Kasse (KassenSichV, § 146a AO). Kassiert wird außerhalb der App (offene Ladenkasse mit täglichem Kassenbericht, Kartenterminal). Mit der Steuerberatung bestätigen.

### 9. Feedback und Absturzberichte der Service-App
- **Zweck:** Fehler finden und die App verbessern.
- **Betroffene / Daten:** Beschäftigte – Name, Nachricht, Bildschirm, optional Bildschirmfoto (kann Tische, Speisen und Namen zeigen), App-Version, Gerätemodell; Absturzberichte ohne Namen (App- und Android-Version, Gerätemodell, Fehlerbericht).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Empfänger:** nur Inhaber/innen (/admin/service); Absturzberichte zusätzlich per E-Mail an das Postfach für Fehlermeldungen.
- **Löschung:** automatisch nach 90 Tagen.

## Technische und organisatorische Maßnahmen (Art. 32)

- Verschlüsselte Übertragung (HTTPS mit HSTS); Datenbankverbindung über TLS.
- Passwörter mit scrypt und Salt; Sitzungen und Reset-Links nur als Hash gespeichert; Cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- Rollen mit getrennten Rechten (Inhaber/in, Küche, Service, Fahrer/in, Gast); jede Seite und Aktion prüft die Rolle.
- Service-App: Anmeldeschlüssel und PINs nur als Hash; Begrenzung der PIN-Versuche; Updates nur mit dem eigenen Signaturschlüssel installierbar.
- Begrenzung von Anmelde-, Reset-, Registrierungs- und Buchungsversuchen.
- IP-Adressen nur als Schlüssel-Hash; automatische Löschfristen (täglicher Cron-Job).
- Sicherheits-Header (Framing verboten, kein MIME-Sniffing, eingeschränkte Referrer und Browser-Rechte).
- Protokoll aller Handlungen in der Verwaltung.
- **Organisatorisch [ergänzen]:** wer Zugang hat, Passwortregeln für das Team, regelmäßiges Leeren der Postfächer.

## Vorgehen bei einer Datenpanne (Art. 33, 34)

Eine Datenpanne ist zum Beispiel: ein verlorenes oder gestohlenes Service-Handy, ein fremder Zugriff auf /admin, ein
an die falsche Person geschickter Gästedatensatz oder ein Hinweis eines Dienstleisters auf einen Sicherheitsvorfall.

1. **Sofort eindämmen:** betroffene Zugänge in /admin/team entfernen oder Passwörter ändern; bei einem verlorenen Handy
   den Team-Zugang der Person entfernen (der Anmeldeschlüssel der App gilt dann nicht mehr) und die PIN neu setzen.
   Bei Verdacht auf einen Einbruch in die Website die Zugangsdaten bei Vercel, Neon, Cloudinary und dem E-Mail-Dienst
   ändern.
2. **Festhalten:** was ist passiert, wann bemerkt, welche Daten und wie viele Personen betroffen, was wurde getan.
   Jede Panne dokumentieren, auch wenn sie nicht gemeldet werden muss (Art. 33 Abs. 5).
3. **Bewerten und melden:** besteht ein Risiko für die Betroffenen, innerhalb von **72 Stunden** nach Bekanntwerden an
   das Bayerische Landesamt für Datenschutzaufsicht (BayLDA) melden, über das Online-Formular auf www.lda.bayern.de.
   Kein Risiko (z. B. Handy war gesperrt und ist wieder da): nur dokumentieren.
4. **Betroffene informieren:** bei hohem Risiko (z. B. Namen, Adressen und Telefonnummern von Gästen in fremden Händen)
   die Betroffenen unverzüglich und in einfacher Sprache informieren (Art. 34).
5. **Nacharbeiten:** Ursache beheben und dieses Verzeichnis bei Bedarf anpassen.

Ansprechpartner/in bei einer Panne: Inhaber/in (siehe oben). Technische Hilfe: **[Entwickler/in mit Kontakt ergänzen]**.
