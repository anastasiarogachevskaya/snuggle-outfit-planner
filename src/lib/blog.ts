export type BlogSection = {
  heading?: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  summary: string;
  sections: BlogSection[];
};

/** Newest first. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "build-your-own-outfit",
    title: "Build your own outfit",
    date: "2026-09-17",
    summary:
      "Layer up lets you put together what your baby is actually wearing and see whether it suits today.",
    sections: [
      {
        paragraphs: [
          "Layerly has always answered one question: what should my baby wear today? But plenty of mornings start the other way round. Baby is already half-dressed, the bodysuit and the fleece are on, and the real question is whether that is enough for the weather outside.",
          "That is what Layer up is for. It sits right under the recommendation on the Today screen, and instead of handing you an outfit, it lets you build one.",
        ],
      },
      {
        heading: "How it works",
        paragraphs: [
          "Tap Layer up and you get your own wardrobe, laid out layer by layer: base layer, bottoms, mid layer, outer layer, and the accessories — hat, mittens, socks. Tick what your baby has on. Layerly compares your combination with what today's weather, your baby's age and the situation you picked would call for, and tells you where the two differ.",
          "You might learn the outfit is fine as it is. You might learn it needs one more mid layer for a 40-minute walk, or that the pramsuit is too much for a short trip to the car. Either way, the answer is about the clothes in front of you, not a generic chart.",
        ],
      },
      {
        heading: "Why we added it",
        paragraphs: [
          "A recommendation you have to follow exactly is a recommendation most parents ignore. Real mornings involve a favourite jumper, a coat that is already in the hallway, and a baby who will not tolerate one more layer. Being able to check your own choice keeps Layerly useful on those days too.",
          "It also makes the advice easier to trust. When you can see why an outfit is a little light or a little heavy, the next day's recommendation makes more sense — and you start to need it less, which is exactly the point.",
        ],
      },
    ],
  },
  {
    slug: "layerly-on-the-app-store",
    title: "Layerly is on the App Store",
    date: "2026-09-15",
    summary:
      "The iPhone app is here — and you can set it up without an email or a password.",
    sections: [
      {
        paragraphs: [
          "Layerly is now an app you can install on your iPhone. Same recommendations, same wardrobe, but built for the thirty seconds before you leave the house: one thumb, one screen, one answer.",
        ],
      },
      {
        heading: "No email, no password",
        paragraphs: [
          "The thing we are most pleased about is what the app does not ask for. Open it for the first time and you go straight into setup: your baby's name and date of birth, your location, and the clothes you own. No account, no email, no password, no verification link to hunt down while holding a baby.",
          "All of it stays on your phone. The profile, the wardrobe, the room temperature you last used, and the comfort ratings you tap after a walk — they live on the device and nowhere else. Close the app and reopen it and you land on Today, already set up.",
        ],
      },
      {
        heading: "An account, only when you want one",
        paragraphs: [
          "There is one extra entry on the profile screen: create an account. An account backs your data up and makes it available on other devices — a second phone, a partner's phone, the website. That is the only reason to make one.",
          "When you do, everything moves across: your baby's details, your location, your wardrobe, and the comfort ratings you have already given. Nothing is re-entered and nothing is lost, and the local copy is cleared once it has been handed over.",
        ],
      },
      {
        heading: "Built for the doorway",
        paragraphs: [
          "The app respects the notch and the home indicator, handles the keyboard properly, asks for location permission at the moment it is needed rather than on launch, and works from where you actually are instead of the city you typed in last month.",
          "If you have been using Layerly in the browser, nothing changes there. The website stays exactly as it is, free, and account-optional.",
        ],
      },
    ],
  },
  {
    slug: "private-by-design",
    title: "Private by design",
    date: "2026-09-12",
    summary:
      "No ads, no third-party trackers, no selling data — what Layerly stores, why, and how long it keeps it.",
    sections: [
      {
        paragraphs: [
          "Layerly is an app about a baby. It knows roughly where you are, how old your child is, and what is in their drawer. That is the kind of information that deserves a clear answer about where it goes — so here it is.",
        ],
      },
      {
        heading: "What we do not do",
        paragraphs: [
          "There are no ads in Layerly, and no advertising networks embedded in it. There are no third-party analytics scripts, no Facebook pixel, no Google tag. We do not store your IP address and we do not fingerprint your device. Nothing is sold or shared with data brokers, because there is no one to sell it to and no business model that depends on it.",
        ],
      },
      {
        heading: "What we do store",
        paragraphs: [
          "If you have an account: your baby's name, date of birth, the location you chose, the wardrobe items you ticked, and the comfort ratings you give. That is what makes the recommendations yours, and it is deleted when you delete your profile.",
          "We also record a small number of anonymous product events — that someone opened the home page, started setup, reached a recommendation, or created an account. It is how we know whether a new screen is helping or getting in the way. The events carry no name, no email and no location, and they are deleted automatically after 90 days. If you delete your account, the events that were linked to it are unlinked immediately and stay only as anonymous counts.",
        ],
      },
      {
        heading: "Where your location goes",
        paragraphs: [
          "Your location is used for one thing: fetching the weather from Open-Meteo, a public weather service. You can also just type a city name and never share GPS at all. On the iPhone app with a local profile, your baby's details never leave the phone in the first place.",
          "The full details are on the privacy page, written to be read rather than skimmed past.",
        ],
      },
    ],
  },
  {
    slug: "one-tap-to-sign-in",
    title: "One tap to sign in",
    date: "2026-09-01",
    summary:
      "Continue with Apple or Google, so nothing stands between you and your baby's profile.",
    sections: [
      {
        paragraphs: [
          "Signing in is the least interesting part of any app, and for a while it was the most annoying part of Layerly. You typed an email, waited for a confirmation message, found it in spam, tapped a link that opened the wrong browser, and then typed a password you had already forgotten.",
          "Now there are two buttons: Continue with Apple and Continue with Google. One tap, no password, no email to wait for.",
        ],
      },
      {
        heading: "What changed",
        paragraphs: [
          "Apple and Google sign-in now run the way the phone expects them to, rather than bouncing you through a browser window that sometimes came back empty and sometimes did not come back at all. If you close the sign-in sheet halfway through, the screen simply returns to where it was instead of sitting there spinning.",
          "Email and password still work if you prefer them, and the confirmation emails now come from Layerly, look like Layerly, and stay valid for a full day rather than expiring while you are still reading them. Password recovery works the same way.",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "An account is optional in Layerly — you can get a recommendation without one. But once you have set up a baby profile and a wardrobe, an account is what keeps them safe and available on your other devices.",
          "Making the sign-in boring is the goal. It should take three seconds and then get out of the way, so you can get back to the actual question of whether that fleece is needed today.",
        ],
      },
    ],
  },
  {
    slug: "advice-before-you-leave",
    title: "Advice that arrives before you leave",
    date: "2026-08-24",
    summary:
      "Getting the weather quickly and reliably, so the morning answer is there in seconds.",
    sections: [
      {
        paragraphs: [
          "An outfit recommendation is only useful if it appears before you are out the door. For a while, Layerly could get stuck on the word Locating — the pram was packed, the coat was on, and the screen was still thinking.",
          "That does not happen any more.",
        ],
      },
      {
        heading: "Faster, and never stuck",
        paragraphs: [
          "Layerly now gives the location request a hard time limit. If your phone cannot get a fix quickly — inside a stairwell, in a lift, in a flat with thick walls — the app stops waiting and falls back to the location you used last, telling you clearly which one it used. You always get an answer, even when the satellites are not cooperating.",
          "When you do tap use my location, Layerly asks for a genuinely fresh reading rather than reusing a stale one your phone had lying around. That matters when you are travelling, or when yesterday's position was three towns away.",
        ],
      },
      {
        heading: "When something is wrong, you can see it",
        paragraphs: [
          "There is now a diagnostics screen that shows exactly what is happening: whether location permission was granted, what the last reading was, and where the weather came from. If Layerly ever gives you a temperature that feels wrong for where you are standing, that page tells you why in one look — usually a permission that was denied at some point and never asked again.",
          "None of this changes the advice itself. It just makes sure the advice turns up in time to be useful.",
        ],
      },
    ],
  },
  {
    slug: "your-wardrobe-not-a-catalogue",
    title: "Your wardrobe, not a catalogue",
    date: "2026-08-11",
    summary:
      "Layerly only suggests clothes you have ticked as owned, so the outfit is one you can actually put on.",
    sections: [
      {
        paragraphs: [
          "Most dressing advice for babies has the same flaw: it tells you what the perfect outfit would be, assuming you own the perfect outfit. A merino base layer, a fleece mid layer, a waterproof pramsuit, and a woollen hat, all in the right size, all clean, all in the hallway.",
          "Real drawers are not like that. So Layerly was built around the clothes you actually have.",
        ],
      },
      {
        heading: "Tick what you own",
        paragraphs: [
          "During setup you go through a wardrobe checklist: bodysuits, sleepsuits, trousers, cardigans, fleeces, overalls, pramsuits, hats, mittens, socks, sleep sacks and their TOG ratings. Tick what is in the drawer, skip what is not.",
          "In a hurry there is a quick setup that ticks a realistic starter wardrobe for you, and a detailed setup if you would rather be precise. Either way you can change it at any time — and you will, because babies grow out of things and seasons turn.",
        ],
      },
      {
        heading: "What that changes",
        paragraphs: [
          "Because Layerly knows what you own, it never recommends a fleece overall you do not have. It works with what is there: if you have no mid layer, it will build the warmth out of two thinner layers instead, or tell you honestly that today is colder than your wardrobe covers.",
          "It also makes gaps visible. If your recommendation keeps stopping short on cold mornings, that is a useful signal about the one item worth buying — rather than a list of twelve.",
        ],
      },
      {
        heading: "Sleep, too",
        paragraphs: [
          "The same applies at night. Layerly picks from the sleep sacks you own, matching the TOG rating to the room temperature and adjusting the pyjamas underneath so the total warmth comes out right. If you only have a 2.5 TOG sack, it will say what to put under it rather than suggesting you buy a 1.0.",
        ],
      },
    ],
  },
  {
    slug: "dressing-guides-for-real-situations",
    title: "Dressing guides for real situations",
    date: "2026-08-07",
    summary:
      "A layering guide by temperature, a stroller-walk guide, and plain answers to the questions parents kept asking.",
    sections: [
      {
        paragraphs: [
          "Layerly gives you one outfit for today. But a lot of parents want to understand the reasoning as well — not just what to put on this morning, but how to think about it in general.",
          "So we wrote two guides and an FAQ, free to read and open to everyone, with no account needed.",
        ],
      },
      {
        heading: "The layering guide",
        paragraphs: [
          "The layering guide walks through the temperature bands, from a mild 20°C afternoon down to a hard frost, and explains what each band means in practice: how many layers, which ones do the work, and where the heat is actually lost — head, hands, feet.",
          "It also covers the rule that catches everyone out: a baby in a pram is not moving, so they need more than you do on the same walk, while a toddler running ahead needs less.",
        ],
      },
      {
        heading: "The stroller-walk guide",
        paragraphs: [
          "Walks have their own rules. A pram with a rain cover is a warm, still, windless box; a baby carrier under your coat is warmer still and needs a layer fewer. Wind chill matters more at pram height than at yours, and a sleeping baby in a car seat is a different case again.",
          "The stroller guide goes through pram, stroller and carrier separately, including when a rain cover helps and when it turns into a greenhouse.",
        ],
      },
      {
        heading: "Straight answers",
        paragraphs: [
          "Alongside the guides there is an FAQ covering the questions that come up most: how the recommendation is built, whether location is required, what happens without an account, how sleep sacks and TOG ratings are handled, and what to do when your wardrobe does not cover the weather.",
          "All of it is written from the same rules the app uses, so the guides and the advice never disagree.",
        ],
      },
    ],
  },
  {
    slug: "try-it-before-you-sign-up",
    title: "Try it before you sign up",
    date: "2026-08-05",
    summary:
      "A full recommendation with no account and no email — pick an age, share a location or type a city, and see the outfit.",
    sections: [
      {
        paragraphs: [
          "Nobody wants to create an account to find out whether an app is any good, least of all at seven in the morning with a baby on one arm. So Layerly now answers the question first and asks for nothing.",
        ],
      },
      {
        heading: "Three taps to an answer",
        paragraphs: [
          "Tap Try Layerly on the home page and you are asked three quick things: roughly how old your baby is, where you are, and what you are doing — staying home, going for a walk, or getting in the car.",
          "Then you get the real thing: a layer-by-layer outfit for today's weather, with a short explanation of why. Not a sample, not a teaser, not a blurred screenshot with a sign-up wall over it.",
        ],
      },
      {
        heading: "Your location, your choice",
        paragraphs: [
          "You can share your location if you want the weather where you are standing, or simply type a city name. Suggestions appear as you type, so it takes a couple of seconds either way. If you skip location entirely, Layerly says so rather than pretending to know.",
          "Nothing is saved until you decide to create an account. Close the tab and there is nothing left behind.",
        ],
      },
      {
        heading: "Why an account exists at all",
        paragraphs: [
          "An account is for the parents who come back every morning. It remembers your baby's exact date of birth rather than an age band, keeps the wardrobe you ticked, and learns from the comfort ratings you give, so the advice gets closer to your child over time.",
          "But that is a decision for later. The first answer should be free, fast, and anonymous — and now it is.",
        ],
      },
    ],
  },
  {
    slug: "layerly-is-live",
    title: "Layerly is live: what should my baby wear today?",
    date: "2026-08-03",
    summary:
      "Today's weather, your baby's age, and the clothes you own — turned into one clear outfit.",
    sections: [
      {
        paragraphs: [
          "Every parent of a small child has had the same argument with themselves in a hallway. It is 9°C and grey. Is that a fleece morning or a pramsuit morning? Will the walk be twenty minutes or an hour? Was yesterday colder than this, and did she come home with cold hands or sweaty hair?",
          "Layerly exists to end that argument. Today it is live at layerly.online.",
        ],
      },
      {
        heading: "The problem with guessing",
        paragraphs: [
          "Babies are bad at regulating their own temperature and worse at telling you about it. Under-dressing is uncomfortable and obvious. Over-dressing is harder to spot and, for the youngest babies, a genuine safety concern — especially for sleep.",
          "The usual advice is a rule of thumb: one more layer than an adult would wear. It is a reasonable start and a poor answer. It does not know whether your baby is three weeks or fourteen months old, whether they will be asleep in a still pram or walking, whether it is windy, whether it is raining, or what is actually in your drawer.",
        ],
      },
      {
        heading: "What Layerly does instead",
        paragraphs: [
          "Layerly takes four things: today's weather and UV index for your location, your baby's age, the situation you are heading into — home, walk, or car — and the clothes you own. From those it builds one specific outfit, layer by layer: base layer, bottoms, mid layer, outer layer, and accessories like a hat, mittens or socks.",
          "It accounts for the details that change the answer. A baby lying still in a pram loses heat differently from one in a carrier against your chest. A rain cover traps warmth. A car seat with the heating on is a different problem from the pavement outside. Twenty minutes is not an hour. On hot days it warns about sun and shade rather than layers.",
          "For sleep, it works from room temperature and the TOG rating of the sleep sacks you own, and sets the pyjamas underneath to match.",
        ],
      },
      {
        heading: "It gets more yours over time",
        paragraphs: [
          "After a walk you can tell Layerly whether your baby seemed cold, comfortable or too warm. Those ratings nudge future recommendations towards your child in particular, because babies genuinely differ and no chart knows yours.",
          "Layerly is free, works in the browser on any phone, and takes its weather from Open-Meteo. There are no ads and no third-party trackers. More to come — and we will write about each step here.",
        ],
      },
    ],
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);

export const formatPostDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
