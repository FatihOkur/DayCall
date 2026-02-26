/**
 * Returns zodiac sign from a date string (YYYY-MM-DD) or Date.
 * Used for onboarding horoscope screen.
 */

interface SignRange {
    name: string;
    from: { month: number; day: number };
    to: { month: number; day: number };
}

const SIGNS: SignRange[] = [
    { name: "Capricorn", from: { month: 12, day: 22 }, to: { month: 1, day: 19 } },
    { name: "Aquarius", from: { month: 1, day: 20 }, to: { month: 2, day: 18 } },
    { name: "Pisces", from: { month: 2, day: 19 }, to: { month: 3, day: 20 } },
    { name: "Aries", from: { month: 3, day: 21 }, to: { month: 4, day: 19 } },
    { name: "Taurus", from: { month: 4, day: 20 }, to: { month: 5, day: 20 } },
    { name: "Gemini", from: { month: 5, day: 21 }, to: { month: 6, day: 20 } },
    { name: "Cancer", from: { month: 6, day: 21 }, to: { month: 7, day: 22 } },
    { name: "Leo", from: { month: 7, day: 23 }, to: { month: 8, day: 22 } },
    { name: "Virgo", from: { month: 8, day: 23 }, to: { month: 9, day: 22 } },
    { name: "Libra", from: { month: 9, day: 23 }, to: { month: 10, day: 22 } },
    { name: "Scorpio", from: { month: 10, day: 23 }, to: { month: 11, day: 21 } },
    { name: "Sagittarius", from: { month: 11, day: 22 }, to: { month: 12, day: 21 } },
];

function dateInRange(month: number, day: number, from: SignRange["from"], to: SignRange["to"]): boolean {
    const fromOrd = from.month * 100 + from.day;
    const toOrd = to.month * 100 + to.day;
    const dOrd = month * 100 + day;
    if (fromOrd <= toOrd) {
        return dOrd >= fromOrd && dOrd <= toOrd;
    }
    return dOrd >= fromOrd || dOrd <= toOrd;
}

export function getZodiacSignFromDate(dateInput: string | Date): string {
    const d = typeof dateInput === "string" ? new Date(dateInput + "T12:00:00") : dateInput;
    const month = d.getMonth() + 1;
    const day = d.getDate();

    for (const sign of SIGNS) {
        if (dateInRange(month, day, sign.from, sign.to)) {
            return sign.name;
        }
    }
    return "Capricorn";
}
