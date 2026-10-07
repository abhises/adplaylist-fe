import type { Dictionary } from "./en";

// Dutch (Netherlands), served on nl.adplaylist.com. Informal "je", as is
// usual for Dutch SaaS.
const nl: Dictionary = {
  meta: {
    description:
      "Een bibliotheek met kant-en-klare advertenties voor Meta, TikTok en meer. Open elke advertentie als bewerkbare kopie, lanceer binnen minuten of vraag maatwerk aan bij ons creatieve team.",
    homeTitle: "Adplaylist: kant-en-klare, bewerkbare advertenties",
  },

  common: {
    signIn: "Inloggen",
    signUp: "Registreren",
    signUpFree: "Gratis aanmelden",
    goToLibrary: "Naar de bibliotheek",
    all: "Alles",
    or: "of",
    somethingWentWrong: "Er ging iets mis.",
    googleFailed: "Inloggen met Google is mislukt.",
    googleWelcome: "Ingelogd met Google. Welkom!",
    googleWelcomeBack: "Ingelogd met Google. Welkom terug!",
    language: "Taal",
  },

  header: {
    how: "Hoe het werkt",
    library: "Bibliotheek",
    pricing: "Prijzen",
    blog: "Blog",
    brands: "Merken",
    about: "Over ons",
    menu: "Menu",
  },

  footer: {
    blog: "Blog",
    terms: "Algemene voorwaarden",
    privacy: "Privacybeleid",
  },

  hero: {
    eyebrow: "De advertentiebibliotheek voor je hele team",
    title: "Steel de strategie, niet de advertentie.",
    lead: "Wij bestuderen advertenties die wereldwijd werken en maken er frisse, originele versies van die je in Canva helemaal eigen maakt.",
    requestCreative: "Creative aanvragen",
    emailPlaceholder: "jij@bedrijf.nl",
    emailLabel: "Zakelijk e-mailadres",
    continueWithGoogle: "Doorgaan met Google",
    perks: ["Gratis lid worden", "In een minuut klaar", "Geen designkennis nodig"],
    search: (count: string) => `Zoek in ${count} creatives…`,
    searchEmpty: "Zoek creatives…",
    request: "+ Aanvragen",
  },

  how: {
    eyebrow: "HOE HET WERKT",
    title: "Van briefing naar live advertentie, zonder bij nul te beginnen.",
    steps: [
      { title: "Blader door de bibliotheek", desc: "Elke advertentie die het team ooit heeft gemaakt, te filteren op platform, categorie, markt en taal." },
      { title: "Open een bewerkbare kopie", desc: "Pas de kop, het aanbod of de markt aan. Het origineel blijft onaangeroerd, zodat iedereen in het team het nog kan gebruiken." },
      { title: "Opslaan en lanceren", desc: "Bewaar creatives voor de campagnes van dit kwartaal. Opslaan blokkeert nooit een advertentie." },
    ],
  },

  library: {
    eyebrow: "EEN KIJKJE BINNEN",
    title: "Wat zit er in de bibliotheek",
    prev: "Vorige creatives",
    next: "Volgende creatives",
    video: "VIDEO",
    editCopy: "Kopie bewerken →",
    open: "Open de volledige bibliotheek",
    explore: "Ontdek de volledige bibliotheek",
  },

  request: {
    eyebrow: "NIET GEVONDEN?",
    title: "Vraag een nieuwe creative aan. Binnen ongeveer 3 dagen klaar.",
    lead: "Vraag het creatieve team om een nieuw formaat, een nieuwe markt of een gloednieuwe advertentie. Gemiddeld ben je in 3 werkdagen klaar.",
    daysLabel: "werkdagen, gemiddeld",
    formTitle: "Nieuwe aanvraag",
    whatDoYouNeed: "Wat heb je nodig?",
    types: {
      size: { label: "Nieuw formaat", note: "Graag een 9:16-versie voor Stories, zelfde tekst." },
      market: { label: "Nieuwe markt", note: "Lokaliseren voor DE-DE. Aanbod behouden, prijs in €." },
      fresh: { label: "Gloednieuwe advertentie", note: "Lanceringsadvertentie voor de herfstcollectie. Zelfde toon als deze." },
    },
    basedOn: "Gebaseerd op",
    sampleHeadline: "Tien druppels. Eén week.",
    notes: "Notities voor het creatieve team",
    send: "Aanvraag versturen",
  },

  finalCta: {
    title: "Stop met het opnieuw bouwen van advertenties die je al hebt.",
    lead: "Maak een account aan en begin binnen een minuut met bladeren.",
  },

  pricing: {
    eyebrow: "PRIJZEN",
    title: "Kies een abonnement. Vraag maatwerk aan wanneer je het nodig hebt.",
    lead: "Elk abonnement bevat de volledige advertentiebibliotheek. Bij Pro en Agency staat één credit voor één nieuwe, op maat gemaakte creative van het designteam.",
    monthly: "Maandelijks",
    yearly: "Jaarlijks · bespaar 20%",
    plans: {
      starter: {
        desc: "Voor marketeers die willen bladeren en bewaren wat het team al heeft gemaakt.",
        goodFor: ["Zzp'ers en individuen", "Af en toe een campagne"],
      },
      pro: {
        desc: "Voor marketeers en interne teams die een vaste stroom nieuwe creatives nodig hebben.",
        goodFor: ["Kleine bedrijven", "Interne advertentieteams"],
      },
      agency: {
        desc: "Voor bureaus die advertenties maken voor veel klanten tegelijk.",
        goodFor: ["Bureaus", "Teams met veel advertenties"],
      },
    },
    features: {
      credits: "Maatwerkadvertenties per maand",
      brands: "Merken",
      seats: "Teamleden",
      turnaround: "Levertijd",
      library: "Toegang tot de volledige bibliotheek",
      editable: "Bewerkbare kopieën",
      sizes: "Alle platformformaten",
      localisation: "Lokalisatie naar nieuwe markten",
      brandKit: "Merkkit en templates",
      video: "Geanimeerde en video-advertenties",
      lead: "Vaste creatief lead",
    },
    turnaround: ["—", "3 dagen", "48 uur"],
    mostPopular: "MEEST GEKOZEN",
    greatFor: "Ideaal voor",
    adsPerMonth: (n: number) => `${n} advertenties / maand`,
    libraryOnly: "Alleen bibliotheek, geen maatwerk",
    perMonth: "/mnd",
    save: (amount: string) => `Bespaar ${amount} per jaar`,
    billedMonthly: "Maandelijks gefactureerd. Altijd opzegbaar.",
    startTrial: "Start gratis proefperiode",
    perAd: (amount: string, yearly: boolean) => `${amount} per advertentie${yearly ? ", jaarlijks gefactureerd" : ""}`,
    upgradeAnytime: "Upgrade wanneer je wilt om advertenties aan te vragen",
    compare: "Vergelijk abonnementen",
    enterpriseEyebrow: "ENTERPRISE",
    enterpriseTitle: "Eigen volume, eigen prijs.",
    enterpriseLead:
      "Meer dan 150 advertenties per maand nodig, of een opzet die we niet aanbieden? Vertel ons wat je nodig hebt en we denken graag met je mee.",
    talkToUs: "Neem contact op",
    footnote:
      "Elk abonnement begint met een gratis proefperiode van 7 dagen. Proefperiodes van Pro en Agency bevatten 2 gratis advertentieaanvragen. Prijzen in USD, exclusief btw.",
  },

  contact: {
    eyebrow: "ENTERPRISE",
    title: "Eigen volume, eigen prijs.",
    lead: "Meer dan 150 advertenties per maand nodig, meerdere merken onder één account of een opzet die we niet aanbieden? Vertel ons wat je nodig hebt en we stellen een abonnement en prijs voor je samen.",
    points: ["Elk maandelijks volume aan maatwerkadvertenties", "Meer merken en teamleden", "Een vaste creatief lead", "Betalen op factuur"],
    thanksToast: "Bedankt! We reageren binnen één werkdag.",
    sendFailed: "Je bericht kon niet worden verstuurd.",
    thanksTitle: "Bedankt, we hebben je bericht.",
    thanksBody: (email: string) => `Iemand van het team reageert binnen één werkdag op ${email}.`,
    formTitle: "Neem contact op",
    name: "Naam",
    namePlaceholder: "Je naam",
    email: "Zakelijk e-mailadres",
    company: "Bedrijf",
    volume: "Maatwerkadvertenties per maand",
    choose: "Kies…",
    notSure: "Weet ik nog niet",
    message: "Wat heb je nodig?",
    messagePlaceholder: "Merken, markten, formaten, hoe vaak je nieuwe advertenties nodig hebt…",
    sending: "Versturen…",
    send: "Bericht versturen",
  },

  auth: {
    sideTitle: "Je volgende advertentie staat klaar.",
    sideLead: "Blader door de creatives in adplaylist en open er een als bewerkbare kopie.",
    email: "Zakelijk e-mailadres",
    password: "Wachtwoord",
    login: {
      title: "Naar je advertenties",
      keepSignedIn: "Ingelogd blijven",
      reset: "Wachtwoord resetten",
      submitting: "Inloggen…",
      welcome: "Ingelogd. Welkom terug!",
      noAccount: "Nog geen account?",
    },
    signup: {
      title: "Maak je account aan",
      fullName: "Volledige naam",
      passwordHint: "Minimaal 8 tekens.",
      confirm: "Bevestig wachtwoord",
      mismatch: "De wachtwoorden komen niet overeen.",
      tooShort: "Het wachtwoord moet minimaal 8 tekens hebben.",
      welcome: "Account aangemaakt. Welkom bij Adplaylist!",
      submitting: "Account aanmaken…",
      submit: "Account aanmaken",
      haveAccount: "Heb je al een account?",
    },
  },
};

export default nl;
