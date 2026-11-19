// The menu card (Speisekarte, November 2026). `npm run db:setup` copies it into an empty database once;
// `npm run menu:sync` brings an existing database in line with it (keeps prices, allergens and the like that were
// entered in /admin). After that the menu is edited in /admin → Speisekarte.
// Plain TypeScript without imports so Node can run it directly (type stripping).

type L = { de: string; en: string; am: string };
type Tag = "special" | "spicy" | "mild" | "vegan" | "glutenfree";
type MenuItem = {
  /** Stable id, so a sync keeps what was entered for the dish in /admin (price, allergens, …). */
  id: string;
  name: L;
  amharic?: string;
  description?: L;
  /** "0,00" = price not set yet: the menu card shows no price and the dish cannot be ordered online. */
  price: string;
  tags?: Tag[];
  /** What guests can ask for with the dish; price = surcharge ("0,00" = free). */
  options?: { name: L; price: string }[];
  /** On the menu card only, not orderable online (e.g. the coffee ceremony, which needs booking ahead). */
  cardOnly?: boolean;
};

type MenuCategory = {
  id: string;
  title: L;
  note?: L;
  drinks?: boolean;
  items: MenuItem[];
};

const same = (s: string): L => ({ de: s, en: s, am: s });

/*
  Dish names stay in their Ethiopian form; descriptions are given in German, English and Amharic.
  Amharic text should be checked by a native speaker. Prices of new dishes are still open ("0,00").
*/
const cardMenu: MenuCategory[] = [
  {
    id: "vorspeisen",
    title: { de: "Vorspeisen", en: "Starters", am: "መግቢያዎች" },
    note: {
      de: "Zu jedem Gericht ist eine Vorspeise nach Wahl möglich.",
      en: "A starter of your choice can be added to any dish.",
      am: "ከማንኛውም ምግብ ጋር የመረጡትን መግቢያ ማዘዝ ይቻላል።",
    },
    items: [
      {
        id: "sambusa-0",
        name: { de: "Sambusa Linsen", en: "Lentil sambusa", am: "ሳምቡሳ ምስር" },
        amharic: "ሳምቡሳ ምስር",
        description: {
          de: "Teigtasche gefüllt mit braunen Linsen, Kräutern und Zwiebeln.",
          en: "Pastry filled with brown lentils, herbs and onions.",
          am: "በምስር፣ በቅመማ ቅመምና በሽንኩርት የተሞላ ሳምቡሳ።",
        },
        options: [{ name: { de: "mit Sauce", en: "with sauce", am: "ከመረቅ ጋር" }, price: "0,00" }],
        price: "2,50",
        tags: ["vegan"],
      },
      {
        id: "sambusa-1",
        name: { de: "Sambusa Fleisch", en: "Beef sambusa", am: "ሳምቡሳ ስጋ" },
        amharic: "ሳምቡሳ ስጋ",
        description: {
          de: "Teigtasche gefüllt mit Rinderhackfleisch, Kräutern und Zwiebeln.",
          en: "Pastry filled with minced beef, herbs and onions.",
          am: "በተፈጨ የበሬ ሥጋ፣ በቅመማ ቅመምና በሽንኩርት የተሞላ ሳምቡሳ።",
        },
        options: [{ name: { de: "mit Sauce", en: "with sauce", am: "ከመረቅ ጋር" }, price: "0,00" }],
        price: "3,00",
      },
    ],
  },
  {
    id: "vegan",
    title: { de: "Vegan & glutenfrei", en: "Vegan & gluten-free", am: "የጾም ምግቦች" },
    note: {
      de: "Glutenfreie vegane Hauptgerichte, serviert mit Injera. Alle Speisen können auch in Kombination bestellt werden.",
      en: "Gluten-free vegan main dishes, served with injera. All dishes can also be ordered as a combination.",
      am: "ከግሉተን ነፃ የሆኑ የጾም ዋና ምግቦች፣ ከእንጀራ ጋር። ሁሉንም ምግቦች በጥምረት ማዘዝ ይቻላል።",
    },
    items: [
      {
        id: "vegan-0",
        name: same("Yetenbi Yetsom"),
        amharic: "የተንቢ የጾም በየዓይነቱ",
        description: {
          de: "Eine Kombination aus Gemüse- und Hülsenfrüchte-Saucen, dazu grüne Bohnen mit Karotten und Grünkohl.",
          en: "A combination of vegetable and pulse sauces, with green beans and carrots and collard greens.",
          am: "የአትክልትና የጥራጥሬ ወጦች ጥምረት፣ ከፎሶሊያ በካሮትና ከጎመን ጋር።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree", "special"],
      },
      {
        id: "vegan-1",
        name: same("Shiro Wot"),
        amharic: "ሽሮ ወጥ",
        description: {
          de: "Das vegane Nationalgericht, das in keinem Haushalt fehlen darf: gemahlene Kichererbsen mit hausgemachter Gewürzmischung, dazu Karotten-Kartoffel-Gemüse und gemischter Salat.",
          en: "The vegan national dish no home is without: ground chickpeas with our house spice blend, with carrot and potato and a mixed salad.",
          am: "ከየትኛውም ቤት የማይጠፋው ብሔራዊ የጾም ምግብ፦ በቤት በተዘጋጀ ቅመም የተሠራ ሽሮ፣ ከካሮትና ድንች እንዲሁም ከሰላጣ ጋር።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree"],
      },
      {
        id: "vegan-2",
        name: same("Misir Wot"),
        amharic: "ምስር ወጥ",
        description: {
          de: "Geschälte braune Linsen in einer pikanten Sauce, verfeinert mit Kräutern und Gewürzen, serviert mit Grünkohl und gemischtem Salat.",
          en: "Split brown lentils in a piquant sauce with herbs and spices, served with collard greens and a mixed salad.",
          am: "በቅመማ ቅመም የተሠራ የምስር ወጥ፣ ከጎመንና ከሰላጣ ጋር።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree"],
      },
      {
        id: "vegan-3",
        name: same("Atkilt Wot"),
        amharic: "አትክልት ወጥ",
        description: {
          de: "Weißkohl-Karotten-Gemüse und grüne Bohnen mit Karotten, verfeinert mit frischen Kräutern und milden Gewürzen.",
          en: "White cabbage with carrots and green beans with carrots, finished with fresh herbs and mild spices.",
          am: "ጥቅል ጎመን በካሮትና ፎሶሊያ በካሮት፣ በትኩስ ቅመምና ለስላሳ ቅመማ ቅመም።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree", "mild"],
      },
    ],
  },
  {
    id: "fleisch",
    title: { de: "Fleischgerichte", en: "Meat dishes", am: "የፍስክ ምግቦች" },
    note: {
      de: "Traditionelle Fleischgerichte (halal), serviert mit Injera. Alle Speisen können auch in Kombination bestellt werden.",
      en: "Traditional meat dishes (halal), served with injera. All dishes can also be ordered as a combination.",
      am: "ባህላዊ የፍስክ ምግቦች (ሐላል)፣ ከእንጀራ ጋር። ሁሉንም ምግቦች በጥምረት ማዘዝ ይቻላል።",
    },
    items: [
      {
        id: "fleisch-2",
        name: same("Key Wot"),
        amharic: "ቀይ ወጥ",
        description: {
          de: "Rindergulasch nach äthiopischer Art, zubereitet mit Zwiebeln, Berbere (Chili) und Kibe (äthiopische Gewürzbutter). Serviert mit Ayib (hausgemachter Hüttenkäse), Shiro (Kichererbsensauce), Grünkohl, Salat und Rote-Bete-Kartoffel-Gemüse.",
          en: "Ethiopian beef stew with onions, berbere (chilli) and kibe (Ethiopian spiced butter). Served with ayib (house-made cottage cheese), shiro (chickpea sauce), collard greens, salad and beetroot with potatoes.",
          am: "በሽንኩርት፣ በበርበሬና በቅቤ የተሠራ የበሬ ወጥ፤ ከአይብ፣ ሽሮ፣ ጎመን፣ ሰላጣና ቀይ ሥር በድንች ጋር።",
        },
        price: "16,00",
        tags: ["spicy"],
      },
      {
        id: "fleisch-3",
        name: same("Alicha Wot"),
        amharic: "አልጫ ወጥ",
        description: {
          de: "Mildes Rindergulasch mit Ayib (hausgemachter Hüttenkäse), zubereitet mit Kibe (äthiopische Gewürzbutter) und Zwiebeln. Serviert mit Shiro (Kichererbsensauce), Weißkohl-Karotten-Gemüse und braunen Linsen.",
          en: "Mild beef stew with ayib (house-made cottage cheese), made with kibe (Ethiopian spiced butter) and onions. Served with shiro (chickpea sauce), white cabbage with carrots and brown lentils.",
          am: "በቅቤና በሽንኩርት የተሠራ ለስላሳ የበሬ አልጫ ወጥ ከአይብ ጋር፤ ከሽሮ፣ ከጥቅል ጎመን በካሮትና ከምስር ጋር።",
        },
        price: "16,00",
        tags: ["mild"],
      },
      {
        id: "fleisch-5",
        name: same("Doro Wot"),
        amharic: "የዶሮ ወጥ",
        description: {
          de: "Äthiopisches Nationalgericht: zarte Hähnchenkeule, geschmort in pikanter Sauce mit Gewürzen und Kräutern (scharf). Serviert mit einem hart gekochten Ei, dazu Frischkäse.",
          en: "Ethiopia's national dish: tender chicken leg braised in a piquant sauce with spices and herbs (hot). Served with a hard-boiled egg and fresh cheese.",
          am: "ብሔራዊ ምግብ፦ በቅመም በተሠራ ወጥ የበሰለ የዶሮ እግር (የሚያቃጥል)፣ ከተቀቀለ እንቁላልና ከአይብ ጋር።",
        },
        price: "0,00",
        tags: ["spicy", "special"],
      },
      {
        id: "fleisch-1",
        name: same("Shekila Tibs"),
        amharic: "ሸክላ ጥብስ",
        description: {
          de: "Rindfleischwürfel, trocken gebraten mit Gewürzmischung und Zwiebeln, serviert im speziellen Tontopf mit Awaze (scharfe Sauce) und Senf. Dazu grüne Bohnen mit Karotten.",
          en: "Diced beef, dry-fried with a spice blend and onions, served in a special clay pot with awaze (hot sauce) and mustard. With green beans and carrots.",
          am: "በቅመምና በሽንኩርት የተጠበሰ የበሬ ሥጋ፣ በሸክላ ድስት ከአዋዜና ሰናፍጭ ጋር፤ ከፎሶሊያ በካሮት ጋር።",
        },
        price: "17,00",
        tags: ["spicy"],
      },
      {
        id: "fleisch-4",
        name: same("Tibs Firfir"),
        amharic: "ጥብስ ፍርፍር",
        description: {
          de: "Zerkleinertes Injera, vermischt mit Key Wot (würzige Rindfleischsauce), serviert mit gekochten Eiern.",
          en: "Torn injera tossed with key wot (spicy beef sauce), served with boiled eggs.",
          am: "በቀይ ወጥ የተለወሰ ፍርፍር እንጀራ፣ ከተቀቀለ እንቁላል ጋር።",
        },
        price: "15,00",
        tags: ["spicy"],
      },
      {
        id: "fleisch-0",
        name: { de: "Yetenbi Spezial Kitfo", en: "Yetenbi Special Kitfo", am: "የተንቢ ስፔሻል ክትፎ" },
        amharic: "የተንቢ ስፔሻል ክትፎ",
        description: {
          de: "Nach Gurage-Art: traditionell roh servierter Rinderhackfleisch-Tartar in einer speziellen Gewürzbutter mit Chili. Dazu Enset-Brot (falsche Banane), Frischkäse und Grünkohl.",
          en: "Gurage style: minced beef tartare, traditionally served raw, in a special spiced butter with chilli. With enset bread (false banana), fresh cheese and collard greens.",
          am: "የጉራጌ ክትፎ፦ በልዩ ቅቤና ሚጥሚጣ የተዘጋጀ፣ ከቆጮ፣ አይብና ጎመን ጋር።",
        },
        options: [{ name: { de: "leicht angebraten", en: "lightly seared", am: "ለብ ያለ" }, price: "0,00" }],
        price: "18,90",
        tags: ["special", "spicy"],
      },
      {
        id: "fleisch-6",
        name: same("Yetenbi Kitfo"),
        amharic: "የተንቢ ክትፎ",
        description: {
          de: "Nach Gurage-Art: traditionell roh servierter Rinderhackfleisch-Tartar, zubereitet mit einer speziellen Gewürzbutter und Chili. Angerichtet mit Frischkäse.",
          en: "Gurage style: minced beef tartare, traditionally served raw, made with a special spiced butter and chilli. Served with fresh cheese.",
          am: "የጉራጌ ክትፎ፦ በልዩ ቅቤና ሚጥሚጣ የተዘጋጀ፣ ከአይብ ጋር።",
        },
        options: [{ name: { de: "leicht angebraten", en: "lightly seared", am: "ለብ ያለ" }, price: "0,00" }],
        price: "0,00",
        tags: ["spicy"],
      },
    ],
  },
  {
    id: "kinder",
    title: { de: "Für Kinder", en: "For children", am: "ለልጆች" },
    note: {
      de: "Für die lieben Kinder.",
      en: "For our little guests.",
      am: "ለውድ ልጆቻችን።",
    },
    items: [
      {
        id: "kinder-0",
        name: { de: "Kleiner Injera-Teller", en: "Small injera plate", am: "ትንሽ የእንጀራ ሳህን" },
        description: {
          de: "Mit 3 verschiedenen Saucen nach Wahl.",
          en: "With 3 sauces of your choice.",
          am: "ከሚመርጧቸው 3 ወጦች ጋር።",
        },
        price: "0,00",
      },
      {
        id: "kinder-1",
        name: { de: "Pfannkuchen", en: "Pancakes", am: "ፓንኬክ" },
        description: {
          de: "Mit Apfelmus und Honig.",
          en: "With apple sauce and honey.",
          am: "ከፖም ፍሬና ከማር ጋር።",
        },
        price: "0,00",
      },
    ],
  },
  {
    id: "beilagen",
    title: { de: "Beilagen & Extras", en: "Sides & extras", am: "ተጨማሪዎች" },
    note: {
      de: "Verschiedene Saucen und Beilagen, zu jedem Gericht dazu bestellbar.",
      en: "Sauces and sides to add to any dish.",
      am: "ከማንኛውም ምግብ ጋር የሚታዘዙ ወጦችና ተጨማሪዎች።",
    },
    items: [
      {
        id: "beilagen-0",
        name: same("Misir"),
        amharic: "ምስር",
        description: { de: "Linsensauce", en: "Lentil sauce", am: "የምስር ወጥ" },
        price: "0,00",
        tags: ["vegan"],
      },
      {
        id: "beilagen-1",
        name: same("Difin Misir"),
        amharic: "ድፍን ምስር",
        description: { de: "Braunes Linsen-Curry", en: "Whole brown lentil curry", am: "የድፍን ምስር ወጥ" },
        price: "0,00",
        tags: ["vegan"],
      },
      {
        id: "beilagen-2",
        name: same("Shiro"),
        amharic: "ሽሮ",
        description: { de: "Kichererbsensauce nach Yetenbi-Art", en: "Chickpea sauce, Yetenbi style", am: "የተንቢ ሽሮ" },
        price: "0,00",
        tags: ["vegan"],
      },
      {
        id: "beilagen-3",
        name: same("Dinich Wot"),
        amharic: "ድንች ወጥ",
        description: {
          de: "Kartoffeln in scharfer Yetenbi-Sauce",
          en: "Potatoes in a hot Yetenbi sauce",
          am: "በየተንቢ ቅመም የተሠራ የድንች ወጥ",
        },
        price: "0,00",
        tags: ["vegan", "spicy"],
      },
      {
        id: "beilagen-4",
        name: same("Gomen"),
        amharic: "ጎመን",
        description: { de: "Grünkohl", en: "Collard greens", am: "ጎመን" },
        price: "0,00",
        tags: ["vegan"],
      },
      {
        id: "beilagen-5",
        name: same("Fossoliya be Karrot"),
        amharic: "ፎሶሊያ በካሮት",
        description: { de: "Grüne Bohnen mit Karotten", en: "Green beans with carrots", am: "ፎሶሊያ በካሮት" },
        price: "0,00",
        tags: ["vegan"],
      },
      {
        id: "beilagen-6",
        name: { de: "Schwarzer Linsensalat", en: "Black lentil salad", am: "የጥቁር ምስር ሰላጣ" },
        description: {
          de: "Salat aus schwarzen Linsen",
          en: "Salad of black lentils",
          am: "ከጥቁር ምስር የተሠራ ሰላጣ",
        },
        price: "0,00",
        tags: ["vegan"],
      },
    ],
  },
  {
    id: "kalt",
    title: { de: "Kaltgetränke", en: "Cold drinks", am: "ቀዝቃዛ መጠጦች" },
    drinks: true,
    items: [
      { id: "kalt-4", name: { de: "Mineralwasser still", en: "Still water", am: "ውሃ" }, price: "2,00" },
      {
        id: "kalt-5",
        name: { de: "Mineralwasser mit Kohlensäure", en: "Sparkling water", am: "አምቦ ውሃ" },
        price: "2,00",
      },
      { id: "kalt-0", name: same("Coca-Cola"), amharic: "ኮካ ኮላ", price: "2,50" },
      { id: "kalt-1", name: same("Coca-Cola Zero"), amharic: "ኮካ ኮላ ዜሮ", price: "2,50" },
      { id: "kalt-2", name: same("Fanta"), amharic: "ፋንታ", price: "2,50" },
      { id: "kalt-3", name: same("Sprite"), amharic: "ስፕራይት", price: "2,50" },
      { id: "kalt-6", name: { de: "Eistee", en: "Iced tea", am: "ቀዝቃዛ ሻይ" }, price: "2,50" },
      { id: "kalt-9", name: { de: "Mangosaft", en: "Mango juice", am: "የማንጎ ጭማቂ" }, price: "3,00" },
      { id: "kalt-7", name: { de: "Orangensaft", en: "Orange juice", am: "የብርቱካን ጭማቂ" }, price: "3,00" },
      { id: "kalt-10", name: { de: "Apfelschorle", en: "Apple spritzer", am: "የፖም ጭማቂ በሶዳ" }, price: "0,00" },
    ],
  },
  {
    id: "heiss",
    title: { de: "Heißgetränke", en: "Hot drinks", am: "ትኩስ መጠጦች" },
    drinks: true,
    items: [
      { id: "heiss-0", name: { de: "Schwarzer Tee", en: "Black tea", am: "ሻይ" }, price: "2,00" },
      {
        id: "heiss-1",
        name: { de: "Ingwertee mit Zitrone & Honig", en: "Ginger tea with lemon & honey", am: "የዝንጅብል ሻይ ከሎሚና ማር ጋር" },
        price: "2,50",
      },
      { id: "heiss-2", name: { de: "Pfefferminztee", en: "Peppermint tea", am: "የናና ሻይ" }, price: "2,50" },
      { id: "heiss-3", name: { de: "Kamillentee", en: "Chamomile tea", am: "የካሞሚል ሻይ" }, price: "2,50" },
    ],
  },
  {
    id: "kaffee",
    title: { de: "Kaffee & Jebena-Zeremonie", en: "Coffee & jebena ceremony", am: "ቡናና ጀበና" },
    drinks: true,
    note: {
      de: "Äthiopien gilt als Wiege des Arabica-Kaffees; der Name „Kaffee“ stammt von der Provinz Kaffa. Bei der traditionellen Zeremonie (Buna) werden die Bohnen frisch gemahlen und dreimal aufgekocht. Nach diesen drei Aufgüssen sind unsere Kaffeespezialitäten benannt. Eine Kaffeezeremonie bitte gesondert vorab anmelden.",
      en: "Ethiopia is the birthplace of Arabica coffee; the word “coffee” comes from the province of Kaffa. In the traditional ceremony (buna) the beans are freshly ground and brewed three times. Our coffees are named after these three rounds. Please book a coffee ceremony in advance.",
      am: "ኢትዮጵያ የአረቢካ ቡና መገኛ ናት፤ «ቡና» የሚለው ስም ከካፋ ግዛት የመጣ ነው። በባህላዊው የቡና ሥነ ሥርዓት ቡናው ተፈጭቶ ሦስት ጊዜ ይፈላል። ቡናዎቻችን በእነዚህ ሦስት ዙሮች ተሰይመዋል። የቡና ሥነ ሥርዓት አስቀድመው ያስመዝግቡ።",
    },
    items: [
      {
        id: "kaffee-0",
        name: same("Abol"),
        amharic: "አቦል",
        description: {
          de: "Eine Tasse Kaffee. Der erste, stärkste Aufguss steht für Gesundheit und Genuss.",
          en: "A cup of coffee. The first and strongest round stands for health and enjoyment.",
          am: "አንድ ስኒ ቡና። የመጀመሪያውና ጠንካራው ዙር ለጤናና ለደስታ።",
        },
        price: "2,50",
      },
      {
        id: "kaffee-1",
        name: same("Tona"),
        amharic: "ቶና",
        description: {
          de: "Jebena Buna für 2–3 Personen. Der zweite Aufguss steht für den Austausch über das Gemeinschaftsleben.",
          en: "Jebena buna for 2–3 people. The second round is for talking over life in the community.",
          am: "ጀበና ቡና ለ2–3 ሰዎች። ሁለተኛው ዙር ለማኅበራዊ ጨዋታ።",
        },
        price: "6,90",
        tags: ["special"],
        cardOnly: true,
      },
      {
        id: "kaffee-2",
        name: same("Bereka"),
        amharic: "በረካ",
        description: {
          de: "Jebena Buna für 3–4 Personen. Der dritte Aufguss bringt Segen und Glück für alle Anwesenden.",
          en: "Jebena buna for 3–4 people. The third round brings blessing and luck to everyone at the table.",
          am: "ጀበና ቡና ለ3–4 ሰዎች። ሦስተኛው ዙር ለሁሉም በረከትና መልካም ዕድል ያመጣል።",
        },
        price: "9,90",
        tags: ["special"],
        cardOnly: true,
      },
    ],
  },
];

/** In Amharic, a dish whose name is the same in every language is shown in Ge'ez script (its `amharic` spelling). */
export const seedMenu: MenuCategory[] = cardMenu.map((category) => ({
  ...category,
  items: category.items.map((item) =>
    item.amharic && item.name.am === item.name.de ? { ...item, name: { ...item.name, am: item.amharic } } : item,
  ),
}));
