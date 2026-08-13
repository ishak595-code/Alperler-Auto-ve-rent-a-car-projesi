#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

function replaceIfPresent(source, from, to) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) return source;
  return source.replace(from, to);
}

function replaceAllIfPresent(source, from, to) {
  if (!source.includes(from)) return source;
  return source.replaceAll(from, to);
}

// 1) Restore the final compact vehicle list after earlier hotfixes run.
{
  let component = await readFile(
    "project/templates/vehicle-list-item.component.ts.template",
    "utf8",
  );
  component = component
    .replace("../../src/models/car.model", "../models/car.model")
    .replace("../../src/services/car.service", "../services/car.service")
    .replace(
      "../../src/pipes/turkish-currency.pipe",
      "../pipes/turkish-currency.pipe",
    );
  await writeFile("src/components/vehicle-list-item.component.ts", component, "utf8");
}

// 2) Rental inventory: compact one-row-per-vehicle list with a stable detail URL.
{
  const path = "src/pages/fleet.component.ts";
  let s = await readFile(path, "utf8");

  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace(
    "imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent, RouterLink],",
    "imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent, RouterLink],",
  );
  s = s.replace(
    'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"',
    'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg"',
  );
  s = s.replace("              Filomuz\n", "              Kiralık Araçlar\n");

  const gridList = `          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-card
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
                [withDriver]="withDriver()"
              >
              </app-vehicle-card>
            }
          </div>`;
  const compactList = `          <div class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-list-item
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
              ></app-vehicle-list-item>
            }
          </div>`;
  s = replaceIfPresent(s, gridList, compactList);
  s = replaceIfPresent(
    s,
    '          <div class="mx-auto flex max-w-5xl flex-col gap-3 px-3 sm:gap-4 sm:px-4 md:px-0">',
    '          <div class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border">',
  );

  await writeFile(path, s, "utf8");
}

// 3) Sales inventory: same compact classified-list behavior.
{
  const path = "src/pages/sales.component.ts";
  let s = await readFile(path, "utf8");

  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace("    VehicleCardComponent,", "    VehicleListItemComponent,");
  s = s.replace(
    'class="text-3xl md:text-4xl font-bold text-slate-900 mb-2"',
    'class="text-3xl md:text-4xl font-bold text-white mb-2"',
  );

  const gridList = `          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-card [car]="car" variant="sale"></app-vehicle-card>
            }
          </div>`;
  const compactList = `          <div class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>
            }
          </div>`;
  s = replaceIfPresent(s, gridList, compactList);
  s = replaceIfPresent(
    s,
    '          <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">',
    '          <div class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border">',
  );

  s = replaceIfPresent(
    s,
    'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"',
    'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg"',
  );
  s = replaceIfPresent(s, 'class="max-w-7xl mx-auto px-4"', 'class="max-w-7xl mx-auto px-2 sm:px-4"');
  s = replaceIfPresent(s, 'class="h-16 flex items-center gap-3"', 'class="min-h-16 flex items-center gap-2 sm:gap-3 py-2"');
  s = replaceIfPresent(s, 'class="relative flex-grow"', 'class="relative flex-grow min-w-0"');
  s = replaceIfPresent(
    s,
    'type="text"\n                [(ngModel)]="searchQuery"',
    'type="search"\n                inputmode="search"\n                autocomplete="off"\n                aria-label="Satılık araçlarda ara"\n                [(ngModel)]="searchQuery"',
  );

  await writeFile(path, s, "utf8");
}

// 4) Homepage rental/sale inventories: compact list, while keeping the curated showcase and tours untouched.
{
  const path = "src/pages/home.component.ts";
  let s = await readFile(path, "utf8");

  s = replaceAllIfPresent(
    s,
    'class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 max-w-7xl mx-auto mb-12 md:mb-16"',
    'class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border mb-10 md:mb-14"',
  );
  s = replaceAllIfPresent(
    s,
    'class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4 mb-12 md:mb-16"',
    'class="mx-auto max-w-5xl overflow-hidden border-y border-slate-200 bg-white md:rounded-xl md:border mb-10 md:mb-14"',
  );

  await writeFile(path, s, "utf8");
}

// 5) Language system: restore Kurdish, persist language choice, and make every incomplete language fall back safely to Turkish keys.
{
  const path = "src/services/ui.service.ts";
  let s = await readFile(path, "utf8");

  s = replaceIfPresent(
    s,
    'export type Language = "TR" | "EN" | "DE" | "FR" | "ES" | "RU" | "ZH" | "AR";',
    'export type Language = "TR" | "EN" | "DE" | "FR" | "KU" | "ES" | "RU" | "ZH" | "AR";',
  );

  if (!s.includes("function mergeTranslationObjects(")) {
    s = s.replace(
      "@Injectable({",
      `function mergeTranslationObjects(base: any, override: any): any {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return override ?? base;
  }
  const result: any = {
    ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}),
  };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = mergeTranslationObjects(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable({`,
    );
  }

  s = replaceIfPresent(
    s,
    "private dictionary: Record<Language, any> = {",
    "private dictionary: Partial<Record<Language, any>> = {",
  );

  if (!s.includes("    KU: {")) {
    const ku = `    KU: {
      nav: { home: "Malper", fleet: "Fîloya Wesayîtan", sales: "Firotina Destê Duyem", tours: "Tûr", earn: "Wesayîta Xwe Nirxîne", about: "Derbarê Me", contact: "Têkilî", blog: "Blog", corporate: "Korporatîf" },
      hero: { title: "Li Bendê Neme: Di 5 Deqîqeyan de Pejirandin, Tavilê Bikeve Rê", subtitle: "Prosedurên dirêj û lêçûnên veşartî tune. Wesayîta xwe hilbijêre û bi ewlehî bikeve rê.", trustLine: "1001+ MÛŞTERIYÊN KÊFXWEŞ • LÊÇÛNA VEŞARTÎ TUNE • FÎLOYA EWLE", ctaSubtext: "Çareseriya bilez û hêsan", cta: "Niha Kirê Bike" },
      buttons: { back: "Vegere", close: "Bigire", book: "Rezervasyon Bike", details: "Hûrgulî", call: "Niha Telefon Bike", send: "Bişîne", rent: "Niha Kirê Bike", rentDriver: "Bi Şofêr Kirê Bike", notAvailable: "Ne Amade Ye", remove: "Rake", apply: "Daxwazê Bişîne", viewAll: "Hemûyan Bibîne", viewAllFleet: "HEMÛ WESAYÎTÊN KIRÊKÎ", viewAllSales: "HEMÛ WESAYÎTÊN FIROTINÊ", viewTours: "Hemû Tûran Bibîne", backHome: "Vegere Malperê", complete: "Temam Bike", pay: "Bide û Temam Bike", appointment: "Daxwaza Randevûyê" },
      common: { close: "Bigire", favorites: "Favorî", menuToggle: "Menûyê Veke an Bigire", addToFav: "Bike Favorî", removeFromFav: "Ji Favoriyan Rake", searchPlaceholder: "Wesayît bigere..." },
      filters: { all: "Hemû", pickup: "Pikap", sedan: "Sedan", hatchback: "Ekonomîk", luxury: "Luks", minibus: "Mînîbus", vip: "VIP", driverActive: "Vebijarka Kirêkirina bi Şofêr Çalak e", rented: "HATIYE KIRÊKIRIN", brand: "Marka û Model", series: "Serî", priceRange: "Navbera Biha", kmRange: "Navbera Kilometreyê", color: "Reng", engine: "Hêza / Hecma Motorê", fuel: "Cureyê Sotemeniyê", transmission: "Cureyê Vitesê", year: "Sala Modelê", damage: "Rewşa Ziyanê" },
      sort: { label: "Rêzkirin", default: "Pêşniyarkirî", priceAsc: "Biha: Ji Kêm ber Bi Zêde", priceDesc: "Biha: Ji Zêde ber Bi Kêm" },
      car: { day: "roj", transmission: "Vites", seats: "Kes", fuel: "Sotemenî", auto: "Otomatîk", manual: "Manuel", diesel: "Dîzel", gasoline: "Benzîn", hybrid: "Hîbrît", electric: "Elektrîk", year: "Model", km: "KM", overview: "Nêrîna Giştî", availability: "Rewşa Amadeyiyê", available: "Amade", similarCars: "Wesayîtên Wekhev", description: "Danasîn", features: "Taybetmendî", details: "Hûrgulî", rentNow: "Niha Kirê Bike", buyNow: "Bikire", listingNo: "Hejmara Îlanê", location: "Hakkari / Yüksekova", callNow: "Niha Telefon Bike", sendMessage: "Peyam Bişîne", whatsappAsk: "Ji WhatsAppê Bipirse" },
      fleet: { subtitle: "Wesayîtên bihêz, rehet û guncaw ji bo rêyên Yüksekova.", searchPlaceholder: "Wesayît Bigere (Marka, Model...)", filterType: "Parzûnên Cureyê Wesayîtê", filterBtn: "Parzûn Bike", sortBtn: "Rêz Bike" },
      home: { booking: { title: "Bi Bilez Wesayît Kirê Bike", type: "Cureyê Xizmetê", types: { individual: "Kirêkirina Kesane", driver: "Kirêkirina bi Şofêr" }, pickup: "Cihê Teslîmgirtinê", locations: { center: "Navenda Yüksekova", airport: "Balafirgeha Yüksekova", bus: "Otogara Yüksekova" }, startDate: "Dîroka Girtinê", endDate: "Dîroka Vegerandinê", searchBtn: "Wesayît Bibîne" }, featured: { badge: "WESAYÎTÊN KIRÊKÎ", title: "Wesayîtên Ewle û Paqij", subtitle: "Wesayîtên ku bakımên wan hatine kirin û ji bo rêwîtiyê amade ne.", viewAll: "Hemû Fîloyê Bibîne", perDay: "/ roj", person: "Kes", rentNow: "Niha Kirê Bike" }, sales: { badge: "WESAYÎTÊN DESTÊ DUYEM", title: "Wesayîtên Destê Duyem ên Bêpirsgirêk û Bi Garantî", description: "Bi dîroka vekirî, ekspertîz û kontrolên temam wesayîta xwe bi ewlehî bikire.", cta: "Wesayîtên Firotinê Bibîne", viewAll: "Hemû Wesayîtên Firotinê Bibîne" }, tours: { title: "Tûrên Keşfê yên Yüksekova", subtitle: "Rêyên taybet ji çiyayên Cîlo heta geliyên Hakkari li benda we ne.", bookBtn: "Niha Rezervasyon Bike", viewAll: "Hemû Tûran Bibîne" }, whyUs: { title: "Çima Alperler Auto?", subtitle: "Ewlehî, şefafî û xizmeta bilez di her gavê de." } },
      sales: { headerTitle: "Wesayîtên Destê Duyem ên Ewle", headerSubtitle: "Wesayîtên bi ekspertîz û kontrolkirî.", badge: "Firotina Wesayîtan", appointment: "Randevû", buy: "Bikire", status: { forSale: "Tê Firotin" } },
      contact: { title: "Têkilî", subtitle: "24/7 Em Li Gel We Ne", infoTitle: "Agahiyên Têkiliyê", formTitle: "Bi Me Re Têkilî Daynin", formSubtitle: "Ji bo pirs û daxwazên xwe formê dagirin.", name: "Nav", surname: "Paşnav", phone: "Telefon", email: "E-Posta", message: "Peyam", send: "Bişîne", successTitle: "Daxwaza We Hate Wergirtin!", successText: "Daxwaza we gihîşt me. Em ê di demeke nêzîk de bi we re têkilî daynin." },
      footer: { rights: "Hemû Maf Parastî Ne.", support: "Piştgiriya 24/7", corporate: "Korporatîf", legal: "Yasayî", newsletter: "Abonetiya Nûçenameyê", newsletterSub: "Ji kampanya û wesayîtên nû agahdar bibin.", emailPlaceholder: "Navnîşana e-postayê", subscribeBtn: "Belaş Abone Bibe", contactUs: "Bi Me Re Têkilî Daynin", contactBtn: "Têkilî", contactText: "Pirsên we hene? Xeta piştgiriyê 24/7 li xizmeta we ye.", links: { privacy: "Polîtîkaya Nepenîtiyê", cookies: "Polîtîkaya Çerezan", terms: "Mercên Kirêkirinê", faq: "Pirsên Pir Tên Pirsîn" } }
    },
`;
    s = s.replace("    ZH: {", ku + "    ZH: {");
  }

  s = replaceIfPresent(
    s,
    `    const base = JSON.parse(
      JSON.stringify(this.dictionary[this.currentLang()]),
    );`,
    `    const trBase = JSON.parse(JSON.stringify(this.dictionary.TR || {}));
    const selected = JSON.parse(JSON.stringify(this.dictionary[this.currentLang()] || {}));
    const base = this.currentLang() === "TR" ? trBase : mergeTranslationObjects(trBase, selected);`,
  );
  s = replaceIfPresent(s, "    if (homeContent) {", '    if (homeContent && this.currentLang() === "TR") {');

  if (!s.includes('localStorage.getItem("alperler-language")')) {
    s = s.replace(
      `  currentLang = signal<Language>("TR");

  // --- ACTIONS ---`,
      `  currentLang = signal<Language>("TR");

  constructor() {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("alperler-language") as Language | null;
      const supported: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];
      if (saved && supported.includes(saved)) this.currentLang.set(saved);
    }
    this.syncDocumentLanguage(this.currentLang());
  }

  // --- ACTIONS ---`,
    );
  }

  s = replaceIfPresent(
    s,
    `  setLanguage(lang: Language) {
    this.currentLang.set(lang);
  }`,
    `  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    if (typeof localStorage !== "undefined") localStorage.setItem("alperler-language", lang);
    this.syncDocumentLanguage(lang);
  }

  private syncDocumentLanguage(lang: Language) {
    if (typeof document === "undefined") return;
    const languageCodes: Record<Language, string> = { TR: "tr", EN: "en", DE: "de", FR: "fr", KU: "ku", ES: "es", RU: "ru", ZH: "zh", AR: "ar" };
    document.documentElement.lang = languageCodes[lang];
    document.documentElement.dir = lang === "AR" ? "rtl" : "ltr";
  }`,
  );

  await writeFile(path, s, "utf8");
}

// 6) Language chooser: show Kurdish explicitly in both desktop and mobile menus.
{
  const path = "src/components/navbar.component.ts";
  let s = await readFile(path, "utf8");
  s = replaceIfPresent(
    s,
    'languages: Language[] = ["TR", "EN", "DE", "FR", "ES", "RU", "ZH", "AR"];',
    'languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];',
  );
  s = replaceIfPresent(
    s,
    '      FR: "Français",\n      ES: "Español",',
    '      FR: "Français",\n      KU: "Kurdî",\n      ES: "Español",',
  );
  await writeFile(path, s, "utf8");
}

console.log("Compact linked lists, persistent language fallback and Kurdish support applied.");
