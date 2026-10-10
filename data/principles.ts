export type Principle = {
  title: string;
  official: string;
  sync: string;
  detail: string;
};

/** Official Humanity 101 core principles. Titles are capitalized for display. Descriptions are exact. */
export const principles: Principle[] = [
  {
    title: "Compassion",
    official: "Showing empathy and care for others",
    sync: "You help a neighbor you already know.",
    detail: "The group stays small, so the care is personal.",
  },
  {
    title: "Empathy",
    official: "Understanding and sharing the feelings of others.",
    sync: "You read what they need, in their own words.",
    detail: "You choose to help. Nobody is pushed to say yes.",
  },
  {
    title: "Forgiveness",
    official: "Letting go of resentment and anger.",
    sync: "A report puts something on hold. It can be put back.",
    detail: "One hard moment does not have to end the group.",
  },
  {
    title: "Integrity",
    official: "Being honest and having strong moral principles.",
    sync: "You approve every word before the group sees it.",
    detail: "A wrong code saves nothing.",
  },
  {
    title: "Kindness",
    official: "Being friendly, generous, and considerate.",
    sync: "Help is given freely. There is no pay and no score.",
    detail: "A thank you is optional.",
  },
  {
    title: "Respect",
    official: "Showing consideration and appreciation for others.",
    sync: "Your phone stays hidden until you share it with one helper.",
    detail: "The group never sees an exact address.",
  },
  {
    title: "Reflection",
    official: "Thinking deeply about one's actions and motives.",
    sync: "Calendar shows a clash, and you decide what to ask.",
    detail: "Nothing is sent until you tap Send.",
  },
];
