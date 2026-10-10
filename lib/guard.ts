import type { Finding, FindingType, GuardResult } from "./types";

/**
 * Privacy guard. Plain rules, no AI model, same result every time.
 * It looks for details that could point strangers to a child or a home,
 * explains why, and builds a safer version. The parent always decides.
 */

const NOT_A_NAME = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "i", "we", "he", "she", "they", "and", "but", "also", "needs", "loves",
  "likes", "is", "was", "has", "goes", "plays", "morning", "afternoon",
  "evening", "today", "tomorrow", "tonight", "weekend", "this", "next",
]);

type Rule = {
  type: FindingType;
  pattern: RegExp;
  why: string;
  // Returns the replacement for a match, or null when the parent must edit.
  replace: (match: RegExpMatchArray) => string | null;
};

const KID_WORD =
  "(?:\\d+\\s*(?:years?|yrs?|yr)[\\s-]*old|son|daughter|kid|child|toddler|baby|boy|girl)";

const rules: Rule[] = [
  {
    type: "child_name",
    // "my son Leo", "my 6 year old, Mia", "our daughter named Zoe"
    pattern: new RegExp(
      `\\b([Mm]y|[Oo]ur)\\s+(${KID_WORD})\\s*,?\\s*(?:named\\s+|called\\s+)?([A-Z][a-z]{1,15})\\b`,
      "g"
    ),
    why: "A child's name makes it easy for a stranger to talk to them or find them.",
    replace: (m) =>
      NOT_A_NAME.has(m[3].toLowerCase()) ? m[0] : `${m[1]} ${m[2]}`,
  },
  {
    type: "child_name",
    // ", his name is Leo"  /  "her name is Mia"
    pattern: /,?\s*\b(?:his|her|their)\s+name\s+is\s+([A-Z][a-z]{1,15})\b\.?/g,
    why: "A child's name makes it easy for a stranger to talk to them or find them.",
    replace: () => "",
  },
  {
    type: "school",
    pattern:
      /\b(?:[A-Z][a-zA-Z.']+\s+){1,3}(?:Elementary|Middle School|High School|Academy|Preschool|Montessori|Charter School|Primary|Intermediate)(?:\s+School)?\b/g,
    why: "A school name tells strangers where a child is on weekdays.",
    replace: () => "school",
  },
  {
    type: "address",
    pattern:
      /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z]+\s+){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Cir|Circle)\b\.?/gi,
    why: "An exact address shows strangers where your family lives.",
    replace: () => "nearby",
  },
  {
    type: "home_area",
    // "we live near Hudson Park"
    pattern:
      /\b(we\s+live|i\s+live|living)\s+(?:near|by|next\s+to|on|off|at)\s+(?:the\s+)?[A-Z][a-zA-Z.']+(?:\s+[A-Z][a-zA-Z.']+){0,3}/g,
    why: "A named landmark next to your home, plus a child's details, makes a family easy to find. A general area is enough.",
    replace: (m) => `${m[1]} nearby`,
  },
  {
    type: "phone",
    pattern: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    why: "Phone numbers stay hidden until both people agree to share them.",
    replace: () => "[shared in chat later]",
  },
  {
    type: "email",
    pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
    why: "Contact details stay hidden until both people agree to share them.",
    replace: () => "[shared in chat later]",
  },
  {
    type: "routine",
    // "pick him up at 3:15", "drop her off at 8am"
    pattern:
      /\b(pick(?:s|ed)?(?:\s+(?:him|her|them))?\s+up|drop(?:s|ped)?(?:\s+(?:him|her|them))?\s+off)\s+(?:at|around)\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?/gi,
    why: "A daily pick up or drop off time tells strangers where a child will be and when.",
    replace: (m) => `${m[1]} on a flexible schedule`,
  },
  {
    type: "routine",
    // "every day", "every weekday at 3pm"
    pattern:
      /\b(?:every|each)\s+(?:day|weekday|morning|afternoon|monday|tuesday|wednesday|thursday|friday)(?:\s+(?:at|around)\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)?/gi,
    why: "A fixed daily routine makes a child's movements easy to predict.",
    replace: () => "on a flexible schedule",
  },
  {
    type: "appearance",
    pattern: /\b(?:suspicious|sketchy|shady)\b|\blooks?\s+(?:foreign|dangerous|homeless|illegal)\b/gi,
    why: "Describe what someone did, not how they look. Looks are not evidence.",
    replace: () => null,
  },
  {
    type: "money",
    pattern:
      /\b(?:gift\s*cards?|wire\s+(?:me|money|transfer)|venmo|cash\s*app|zelle|send\s+(?:me\s+)?money|deposit)\b/gi,
    why: "There are no payments in this app. Requests for money are a common scam sign.",
    replace: () => null,
  },
];

function tidy(text: string): string {
  return text
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*(and|but)\b/gi, " $1")
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function checkPost(text: string): GuardResult {
  const findings: Finding[] = [];
  let working = text;

  for (const rule of rules) {
    const matches = [...working.matchAll(rule.pattern)];
    if (matches.length === 0) continue;

    for (const m of matches) {
      const replacement = rule.replace(m);
      // A rule that decides "not a name" returns the original text: skip it.
      if (replacement !== null && replacement === m[0]) continue;
      findings.push({
        type: rule.type,
        found: m[0].trim().replace(/^,\s*/, ""),
        why: rule.why,
        replacement,
      });
    }

    working = working.replace(rule.pattern, (...args) => {
      // String.replace passes: match, p1.., offset, string. Rebuild a match-like array.
      const groups = args.slice(0, args.findIndex((a) => typeof a === "number"));
      const replacement = rule.replace(groups as unknown as RegExpMatchArray);
      return replacement === null ? groups[0] : replacement;
    });
  }

  const safeText = tidy(working);
  return {
    findings,
    safeText,
    risky: findings.length > 0,
    needsManualEdit: findings.some((f) => f.replacement === null),
  };
}
