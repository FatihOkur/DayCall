/**
 * Onboarding — user-facing strings (i18n-ready).
 * Use these keys in components; replace with t(key) when i18n is wired.
 */

export const onboardingCopy = {
    // Screen 1 — Welcome
    welcomeBubble: "Hi, my name is Fio. Congratulations on starting this journey.",
    continue: "Continue",

    // Screen 2 — Journey
    journeyBubble:
        "I will call you for a few minutes every day to keep your daily journal.",

    // Screen 3 — Ready for questions
    readyBubble: "To personalize your journey, I have X short questions for you.",
    iAmReady: "I am ready",

    // Screen 4 — Name
    nameQuestion: "What's your name?",
    namePlaceholder: "Your name",

    // Screen 5 — Birth date
    birthDateQuestion: "When were you born?",
    birthDatePlaceholder: "Select date",

    // Screen 6 — Horoscope
    horoscopeMessage: "Wow {name}, It's good to know you're a {horoscope} :)",

    // Screen 7 — Gender
    genderQuestion: "How do you identify?",
    genderMale: "Male",
    genderFemale: "Female",
    genderNonbinary: "Non-binary",
    genderPreferNot: "Prefer not to say",
    genderOther: "Other",

    // Screen 8 — Journaling before
    journalingBeforeQuestion: "Have you tried journaling before?",
    journalingNever: "Never",
    journalingFewTimes: "A few times",
    journalingSometimes: "Sometimes",
    journalingRegularly: "Regularly",
    journalingDaily: "Daily",

    // Screen 9 — Emotional traits (multiselect)
    emotionalTraitsQuestion: "Select all that apply to you",
    emotionalTraitsIntro: "Select all that apply to you",
    traitCalm: "Calm",
    traitAnxious: "Anxious",
    traitCreative: "Creative",
    traitReflective: "Reflective",
    traitEnergetic: "Energetic",
    traitIntroverted: "Introverted",
    traitEmpathetic: "Empathetic",
    traitCurious: "Curious",
    traitStressed: "Stressed",
    traitOptimistic: "Optimistic",

    // Screen 10 — Where heard
    whereHeardQuestion: "Where did you hear about us?",
    whereHeardSocial: "Social media",
    whereHeardFriend: "Friend or family",
    whereHeardAppStore: "App store",
    whereHeardBlog: "Blog or article",
    whereHeardOther: "Other",

    // Screen 11 — Call time
    callTimeQuestion: "Around what time do you want to be called?",
    callTimeSubtitle: "1 hour time frame",
    callTimePlaceholder: "Select time",

    // Screen 12 — Committed
    committedTitle: "I am committed",
    committedButton: "Get started",
} as const;

export type OnboardingCopyKey = keyof typeof onboardingCopy;
