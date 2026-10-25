import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Order } from "../orders";
import type { Reservation } from "../reservations";

// The wording of the guest emails in German, English and Amharic.
// Emails to the team are German only and written in reservation-emails.ts / order-emails.ts.

export type ReservationEmailKind = "received" | "confirmed" | "declined" | "cancelled";

export const reservationTexts: Record<
  Locale,
  Record<ReservationEmailKind, { subject: (reservation: Reservation) => string; intro: string }> & {
    labels: string[];
    outro: string;
    staffNote: string;
    cancel: string;
  }
> = {
  de: {
    received: {
      subject: (reservation) => `Eure Anfrage bei Yetenbi (${reservation.reference})`,
      intro: "danke für eure Anfrage. Sie ist bei uns angekommen, wir melden uns, sobald der Tisch fest ist.",
    },
    confirmed: {
      subject: (reservation) => `Bestätigt: euer Tisch bei Yetenbi (${reservation.reference})`,
      intro: "euer Tisch ist reserviert. Wir freuen uns auf euch! Im Anhang findet ihr einen Kalendereintrag.",
    },
    declined: {
      subject: (reservation) => `Eure Anfrage bei Yetenbi (${reservation.reference})`,
      intro:
        "leider können wir zu dieser Zeit keinen Tisch anbieten. Ruft uns gerne an, dann finden wir eine andere Zeit.",
    },
    cancelled: {
      subject: (reservation) => `Storniert: eure Reservierung bei Yetenbi (${reservation.reference})`,
      intro:
        "leider mussten wir diese Reservierung stornieren. Das tut uns leid! Ruft uns gerne an, dann finden wir eine andere Zeit.",
    },
    labels: ["Datum", "Uhrzeit", "Personen", "Nummer"],
    outro: "Bis bald in der Theaterstraße 6, Würzburg.",
    staffNote: "Nachricht vom Restaurant",
    cancel: "Doch verhindert? Hier könnt ihr die Reservierung stornieren.",
  },
  en: {
    received: {
      subject: (reservation) => `Your request at Yetenbi (${reservation.reference})`,
      intro: "thank you for your request. It has reached us, and we'll be in touch as soon as your table is set.",
    },
    confirmed: {
      subject: (reservation) => `Confirmed: your table at Yetenbi (${reservation.reference})`,
      intro: "your table is booked. We look forward to seeing you! A calendar entry is attached.",
    },
    declined: {
      subject: (reservation) => `Your request at Yetenbi (${reservation.reference})`,
      intro: "unfortunately we can't offer a table at that time. Give us a call and we'll find another one.",
    },
    cancelled: {
      subject: (reservation) => `Cancelled: your reservation at Yetenbi (${reservation.reference})`,
      intro: "unfortunately we had to cancel this reservation. We're sorry! Give us a call and we'll find another time.",
    },
    labels: ["Date", "Time", "Guests", "Reference"],
    outro: "See you soon at Theaterstraße 6, Würzburg.",
    staffNote: "Message from the restaurant",
    cancel: "Can't make it after all? Cancel your reservation here.",
  },
  am: {
    received: {
      subject: (reservation) => `ጥያቄዎ ደርሶናል – Yetenbi (${reservation.reference})`,
      intro: "ስለ ጥያቄዎ እናመሰግናለን። ደርሶናል፤ ቦታው ሲዘጋጅ እናሳውቅዎታለን።",
    },
    confirmed: {
      subject: (reservation) => `ተረጋግጧል፦ ቦታዎ በYetenbi (${reservation.reference})`,
      intro: "ቦታዎ ተይዟል። በጉጉት እንጠብቅዎታለን! የቀን መቁጠሪያ ፋይል ተያይዟል።",
    },
    declined: {
      subject: (reservation) => `ጥያቄዎ – Yetenbi (${reservation.reference})`,
      intro: "ይቅርታ፣ በዚህ ሰዓት ቦታ የለንም። እባክዎ ይደውሉልን፣ ሌላ ሰዓት እንፈልግልዎታለን።",
    },
    cancelled: {
      subject: (reservation) => `ተሰርዟል፦ ቦታዎ በYetenbi (${reservation.reference})`,
      intro: "ይቅርታ፣ ይህን ቦታ ለመሰረዝ ተገደናል። እባክዎ ይደውሉልን፣ ሌላ ሰዓት እንፈልግልዎታለን።",
    },
    labels: ["ቀን", "ሰዓት", "የሰው ብዛት", "ቁጥር"],
    outro: "በቅርቡ እንገናኝ፣ Theaterstraße 6, Würzburg።",
    staffNote: "ከምግብ ቤቱ መልእክት",
    cancel: "መምጣት ካልቻሉ ቦታውን እዚህ ይሰርዙ።",
  },
};

export const passwordResetTexts: Record<Locale, { subject: string; intro: string; button: string; outro: string }> = {
  de: {
    subject: "Passwort zurücksetzen – Yetenbi",
    intro:
      "über den Knopf unten könnt ihr ein neues Passwort für euer Yetenbi-Konto festlegen. Der Link ist eine Stunde gültig.",
    button: "Neues Passwort festlegen",
    outro: "Habt ihr das nicht angefordert? Dann ignoriert diese E-Mail einfach.",
  },
  en: {
    subject: "Reset your password – Yetenbi",
    intro: "use the button below to choose a new password for your Yetenbi account. The link is valid for one hour.",
    button: "Choose a new password",
    outro: "Didn't ask for this? Just ignore this email.",
  },
  am: {
    subject: "የይለፍ ቃል ዳግም ማስጀመሪያ – Yetenbi",
    intro: "ከታች ያለውን ቁልፍ በመጫን አዲስ የይለፍ ቃል ያዘጋጁ። ሊንኩ ለአንድ ሰዓት ያገለግላል።",
    button: "አዲስ የይለፍ ቃል",
    outro: "ይህን ካልጠየቁ ኢሜይሉን ችላ ይበሉ።",
  },
};

export const verificationTexts: Record<Locale, { subject: string; intro: string; button: string; outro: string }> = {
  de: {
    subject: "Bitte bestätigt eure E-Mail-Adresse – Yetenbi",
    intro:
      "willkommen bei Yetenbi! Bitte bestätigt mit dem Knopf unten, dass diese E-Mail-Adresse euch gehört. Erst dann könnt ihr online bestellen. Der Link ist 24 Stunden gültig.",
    button: "E-Mail-Adresse bestätigen",
    outro:
      "Habt ihr kein Konto angelegt? Dann ignoriert diese E-Mail einfach; ohne Bestätigung kann niemand mit dieser Adresse bestellen.",
  },
  en: {
    subject: "Please confirm your email address – Yetenbi",
    intro:
      "welcome to Yetenbi! Please use the button below to confirm that this email address is yours. You can order online once it is confirmed. The link is valid for 24 hours.",
    button: "Confirm email address",
    outro: "Didn't create an account? Just ignore this email; without confirmation nobody can order with this address.",
  },
  am: {
    subject: "እባክዎ የኢሜይል አድራሻዎን ያረጋግጡ – Yetenbi",
    intro:
      "ወደ Yetenbi እንኳን በደህና መጡ! ይህ ኢሜይል የእርስዎ መሆኑን ከታች ባለው ቁልፍ ያረጋግጡ። ከዚያ በኋላ በመስመር ላይ ማዘዝ ይችላሉ። ሊንኩ ለ24 ሰዓት ያገለግላል።",
    button: "ኢሜይል አረጋግጥ",
    outro: "መለያ ካልከፈቱ ይህን ኢሜይል ችላ ይበሉ።",
  },
};

/** Every step of an order is emailed to the guest (if they gave an email address). */
export type OrderEmailKind =
  "received" | "accepted" | "cooked" | "packed" | "ready" | "on_the_way" | "completed" | "rejected" | "cancelled";

export const orderTexts: Record<
  Locale,
  Record<OrderEmailKind, (order: Order) => { subject: string; intro: string }> & {
    status: string;
    total: string;
    deposit: string;
    deliveryFee: string;
    delivery: string;
    pickup: string;
    terms: string;
    termsLink: string;
  }
> = {
  de: {
    received: (order) => ({
      subject: `Eure Bestellung ${order.reference} ist eingegangen`,
      intro: "danke für eure Bestellung! Wir bestätigen sie gleich und sagen euch, wann sie fertig ist.",
    }),
    accepted: (order) => ({
      subject: `Bestellung ${order.reference} angenommen`,
      intro: `eure Bestellung ist angenommen. ${order.method === "delivery" ? "Lieferung" : "Abholbereit"} in etwa ${order.etaMinutes ?? 30} Minuten.`,
    }),
    cooked: (order) => ({
      subject: `Bestellung ${order.reference}: Essen ist fertig`,
      intro: "euer Essen ist fertig gekocht und wird jetzt verpackt.",
    }),
    packed: (order) => ({
      subject: `Bestellung ${order.reference} ist verpackt`,
      intro:
        order.method === "delivery"
          ? "eure Bestellung ist verpackt und geht gleich an den Fahrer."
          : "eure Bestellung ist verpackt und gleich abholbereit.",
    }),
    ready: (order) => ({
      subject: `Bestellung ${order.reference} ist abholbereit`,
      intro: "eure Bestellung wartet auf euch in der Theaterstraße 6. Bis gleich!",
    }),
    on_the_way: (order) => ({
      subject: `Bestellung ${order.reference} ist unterwegs`,
      intro: "eure Bestellung ist unterwegs zu euch. Guten Appetit!",
    }),
    completed: (order) => ({
      subject:
        order.method === "delivery"
          ? `Bestellung ${order.reference} geliefert`
          : `Bestellung ${order.reference} abgeholt`,
      intro: `eure Bestellung wurde ${order.method === "delivery" ? "geliefert" : "abgeholt"}. Danke und guten Appetit!`,
    }),
    cancelled: (order) => ({
      subject: `Bestellung ${order.reference} storniert`,
      intro: "eure Bestellung wurde storniert. Bei Fragen ruft uns bitte an.",
    }),
    rejected: (order) => ({
      subject: `Bestellung ${order.reference}`,
      intro: "leider können wir eure Bestellung gerade nicht annehmen. Bitte ruft uns an, wir helfen gerne weiter.",
    }),
    status: "Status ansehen",
    total: "Summe (inkl. MwSt.)",
    deposit: "+ Pfand",
    deliveryFee: "+ Lieferung",
    terms:
      "Es gelten unsere Bestellbedingungen. Für frisch zubereitete Speisen besteht kein Widerrufsrecht (§ 312g Abs. 2 BGB).",
    termsLink: "Bestellbedingungen ansehen",
    delivery: "Lieferung",
    pickup: "Abholung",
  },
  en: {
    received: (order) => ({
      subject: `Your order ${order.reference} has arrived`,
      intro: "thank you for your order! We'll confirm it shortly and tell you when it will be ready.",
    }),
    accepted: (order) => ({
      subject: `Order ${order.reference} accepted`,
      intro: `your order is accepted. ${order.method === "delivery" ? "Delivery" : "Ready for pick-up"} in about ${order.etaMinutes ?? 30} minutes.`,
    }),
    cooked: (order) => ({
      subject: `Order ${order.reference}: food is ready`,
      intro: "your food is cooked and is being packed now.",
    }),
    packed: (order) => ({
      subject: `Order ${order.reference} is packed`,
      intro:
        order.method === "delivery"
          ? "your order is packed and goes to the driver shortly."
          : "your order is packed and will be ready for pick-up in a moment.",
    }),
    ready: (order) => ({
      subject: `Order ${order.reference} is ready for pick-up`,
      intro: "your order is waiting for you at Theaterstraße 6. See you soon!",
    }),
    on_the_way: (order) => ({
      subject: `Order ${order.reference} is on its way`,
      intro: "your order is on its way to you. Enjoy your meal!",
    }),
    completed: (order) => ({
      subject:
        order.method === "delivery" ? `Order ${order.reference} delivered` : `Order ${order.reference} picked up`,
      intro: `your order has been ${order.method === "delivery" ? "delivered" : "picked up"}. Thank you, and enjoy your meal!`,
    }),
    cancelled: (order) => ({
      subject: `Order ${order.reference} cancelled`,
      intro: "your order has been cancelled. Please call us if you have any questions.",
    }),
    rejected: (order) => ({
      subject: `Order ${order.reference}`,
      intro: "unfortunately we can't take your order right now. Please give us a call and we'll help.",
    }),
    status: "View status",
    total: "Total (incl. VAT)",
    deposit: "+ Deposit",
    deliveryFee: "+ Delivery",
    terms: "Our ordering terms apply. Freshly prepared food has no right of withdrawal (§ 312g(2) German Civil Code).",
    termsLink: "Read the ordering terms",
    delivery: "Delivery",
    pickup: "Pick-up",
  },
  am: {
    received: (order) => ({
      subject: `ትዕዛዝዎ ${order.reference} ደርሶናል`,
      intro: "ስለ ትዕዛዝዎ እናመሰግናለን! በቅርቡ አረጋግጠን መቼ እንደሚደርስ እናሳውቅዎታለን።",
    }),
    accepted: (order) => ({
      subject: `ትዕዛዝ ${order.reference} ተቀባይነት አግኝቷል`,
      intro: `ትዕዛዝዎ ተቀባይነት አግኝቷል። በግምት በ${order.etaMinutes ?? 30} ደቂቃ ${order.method === "delivery" ? "ይደርሳል" : "ዝግጁ ይሆናል"}።`,
    }),
    cooked: (order) => ({ subject: `ትዕዛዝ ${order.reference}፦ ምግቡ ተዘጋጅቷል`, intro: "ምግብዎ ተበስሏል፤ አሁን እየታሸገ ነው።" }),
    packed: (order) => ({
      subject: `ትዕዛዝ ${order.reference} ታሽጓል`,
      intro: order.method === "delivery" ? "ትዕዛዝዎ ታሽጓል፤ በቅርቡ ለአድራሹ ይሰጣል።" : "ትዕዛዝዎ ታሽጓል፤ በቅርቡ ለመውሰድ ዝግጁ ይሆናል።",
    }),
    ready: (order) => ({
      subject: `ትዕዛዝ ${order.reference} ለመውሰድ ዝግጁ ነው`,
      intro: "ትዕዛዝዎ Theaterstraße 6 ላይ ይጠብቅዎታል። በቅርቡ እንገናኝ!",
    }),
    on_the_way: (order) => ({
      subject: `ትዕዛዝ ${order.reference} በመንገድ ላይ ነው`,
      intro: "ትዕዛዝዎ ወደ እርስዎ በመንገድ ላይ ነው። መልካም ምግብ!",
    }),
    completed: (order) => ({
      subject: order.method === "delivery" ? `ትዕዛዝ ${order.reference} ደርሷል` : `ትዕዛዝ ${order.reference} ተወስዷል`,
      intro: `ትዕዛዝዎ ${order.method === "delivery" ? "ደርሷል" : "ተወስዷል"}። እናመሰግናለን፣ መልካም ምግብ!`,
    }),
    cancelled: (order) => ({ subject: `ትዕዛዝ ${order.reference} ተሰርዟል`, intro: "ትዕዛዝዎ ተሰርዟል። ጥያቄ ካለዎ እባክዎ ይደውሉልን።" }),
    rejected: (order) => ({ subject: `ትዕዛዝ ${order.reference}`, intro: "ይቅርታ፣ አሁን ትዕዛዝዎን መቀበል አንችልም። እባክዎ ይደውሉልን።" }),
    status: "ሁኔታውን ይመልከቱ",
    total: "ድምር (ተ.እ.ታ. ጨምሮ)",
    deposit: "+ የጠርሙስ ተቀማጭ",
    deliveryFee: "+ ማድረሻ",
    terms: "የትዕዛዝ ደንቦቻችን ይተገበራሉ። ትኩስ ለተዘጋጀ ምግብ የመሰረዝ መብት የለም።",
    termsLink: "የትዕዛዝ ደንቦችን ይመልከቱ",
    delivery: "ማድረስ",
    pickup: "መውሰድ",
  },
};
