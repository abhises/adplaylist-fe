// English copy for the public pages (landing page, its header and footer,
// sign in and sign up). Every other language's dictionary has this shape,
// so TypeScript flags any string a translation is missing.
const en = {
  meta: {
    description:
      "A library of ready-made ad creatives for Meta, TikTok and more. Open any ad as an editable copy, launch in minutes, or request custom ads from our creative team.",
    homeTitle: "Adplaylist: Ready-Made, Editable Ad Creatives",
  },

  common: {
    signIn: "Sign in",
    signUp: "Sign up",
    signUpFree: "Sign up free",
    goToLibrary: "Go to Library",
    all: "All",
    or: "or",
    somethingWentWrong: "Something went wrong.",
    googleFailed: "Google sign-in failed.",
    googleWelcome: "Signed in with Google. Welcome!",
    googleWelcomeBack: "Signed in with Google. Welcome back!",
    language: "Language",
  },

  header: {
    how: "How it works",
    library: "Library",
    pricing: "Pricing",
    blog: "Blog",
    brands: "Brands",
    about: "About us",
    menu: "Menu",
  },

  footer: {
    blog: "Blog",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
  },

  hero: {
    eyebrow: "The ad library for your whole team",
    title: "Steal the strategy, not the ad.",
    lead: "We study ads that are working worldwide and create fresh, original versions you can make your own in Canva.",
    requestCreative: "Request a creative",
    emailPlaceholder: "you@company.com",
    emailLabel: "Work email",
    continueWithGoogle: "Continue with Google",
    perks: ["Free to join", "Set up in under a minute", "No design skills needed"],
    search: (count: string) => `Search ${count} creatives…`,
    searchEmpty: "Search creatives…",
    request: "+ Request",
  },

  how: {
    eyebrow: "HOW IT WORKS",
    title: "From brief to live ad without starting from scratch.",
    steps: [
      { title: "Browse the library", desc: "Every ad the team has ever shipped, filterable by platform, category, market, and language." },
      { title: "Open an editable copy", desc: "Swap the headline, offer, or market. The original stays untouched, so anyone on the team can still use it." },
      { title: "Save and ship", desc: "Bookmark creatives for this quarter's campaigns. Saving never locks an ad." },
    ],
  },

  library: {
    eyebrow: "A PEEK INSIDE",
    title: "What’s in the library",
    prev: "Previous creatives",
    next: "Next creatives",
    video: "VIDEO",
    editCopy: "Edit copy →",
    open: "Open the full library",
    explore: "Explore the full library",
  },

  request: {
    eyebrow: "CAN’T FIND IT?",
    title: "Request a new creative. Get it in about 3 days.",
    lead: "Ask the creative team for a new size, a market, or a brand-new ad. Average turnaround is 3 working days.",
    daysLabel: "working days, on average",
    formTitle: "New request",
    whatDoYouNeed: "What do you need?",
    types: {
      size: { label: "New size", note: "Need a 9:16 version for Stories, same copy." },
      market: { label: "New market", note: "Localise for DE-DE. Keep the offer, swap the price to €." },
      fresh: { label: "Brand-new ad", note: "Launch ad for the autumn range. Same tone as this one." },
    },
    basedOn: "Based on",
    sampleHeadline: "Ten drops. One week.",
    notes: "Notes for the creative team",
    send: "Send request",
  },

  finalCta: {
    title: "Stop rebuilding ads you already have.",
    lead: "Create an account and start browsing in under a minute.",
  },

  pricing: {
    eyebrow: "PRICING",
    title: "Pick a plan. Request custom ads when you need them.",
    lead: "Every plan includes the full ad library. On Pro and Agency, one credit is one new custom creative from the design team.",
    monthly: "Monthly",
    yearly: "Yearly · save 20%",
    plans: {
      starter: {
        desc: "For marketers who want to browse and save what the team has already made.",
        goodFor: ["Individuals", "Occasional campaigns"],
      },
      pro: {
        desc: "For marketers and in-house teams who need a steady flow of fresh creatives.",
        goodFor: ["Small businesses", "In-house ad teams"],
      },
      agency: {
        desc: "For agencies producing ads for many clients at once.",
        goodFor: ["Agencies", "High-volume ad teams"],
      },
    },
    features: {
      credits: "Custom ads per month",
      brands: "Brands",
      seats: "Team seats",
      turnaround: "Turnaround",
      library: "Full ad library access",
      localisation: "Localisation into new markets",
      brandKit: "Brand kit and templates",
      video: "Animated and video ads",
      lead: "Dedicated creative lead",
    },
    turnaround: ["—", "3 days", "48 hours"],
    mostPopular: "MOST POPULAR",
    greatFor: "Great for",
    adsPerMonth: (n: number) => `${n} ads / month`,
    libraryOnly: "Library only, no custom ads",
    perMonth: "/mo",
    save: (amount: string) => `Save ${amount} a year`,
    billedMonthly: "Billed monthly. Cancel anytime.",
    startTrial: "Start free trial",
    perAd: (amount: string, yearly: boolean) => `${amount} per ad${yearly ? ", billed yearly" : ""}`,
    upgradeAnytime: "Upgrade anytime to request ads",
    compare: "Compare plans",
    enterpriseEyebrow: "ENTERPRISE",
    enterpriseTitle: "Custom volume, custom price.",
    enterpriseLead:
      "Need more than 150 ads a month or a setup we don’t list? Tell us what you need and we’re happy to solve it with you.",
    talkToUs: "Talk to us",
    footnote:
      "Every plan starts with a 7-day free trial. Pro and Agency trials include 2 free ad requests. Prices in USD, excluding tax.",
  },

  contact: {
    eyebrow: "ENTERPRISE",
    title: "Custom volume, custom price.",
    lead: "Need more than 150 ads a month, several brands under one account, or a setup we don’t list? Tell us what you need and we’ll put together a plan and price for you.",
    points: ["Any monthly volume of custom ads", "More brands and team seats", "A dedicated creative lead", "Invoiced billing"],
    thanksToast: "Thanks! We'll get back to you within one working day.",
    sendFailed: "Couldn't send your message.",
    thanksTitle: "Thanks, we’ve got it.",
    thanksBody: (email: string) => `Someone from the team will reply to ${email} within one working day.`,
    formTitle: "Talk to us",
    name: "Name",
    namePlaceholder: "Your name",
    email: "Work email",
    company: "Company",
    volume: "Custom ads per month",
    choose: "Choose…",
    notSure: "Not sure yet",
    message: "What do you need?",
    messagePlaceholder: "Brands, markets, formats, how often you need new ads…",
    sending: "Sending…",
    send: "Send message",
  },

  auth: {
    sideTitle: "Your next ad is here.",
    sideLead: "Browse the creatives in adplaylist, then open any one as an editable copy.",
    email: "Work email",
    password: "Password",
    login: {
      title: "Get to your ads",
      keepSignedIn: "Keep me signed in",
      reset: "Reset password",
      submitting: "Signing in…",
      welcome: "Signed in. Welcome back!",
      noAccount: "Don’t have an account?",
    },
    signup: {
      title: "Create your account",
      fullName: "Full name",
      passwordHint: "At least 8 characters.",
      confirm: "Confirm password",
      mismatch: "Passwords don't match.",
      tooShort: "Password must be at least 8 characters.",
      welcome: "Account created. Welcome to Adplaylist!",
      submitting: "Creating account…",
      submit: "Create account",
      haveAccount: "Already have an account?",
    },
  },
};

export default en;
export type Dictionary = typeof en;
