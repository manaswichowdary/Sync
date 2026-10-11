export type MemberView = {
  userId: string;
  firstName: string;
  role: "creator" | "member";
  badges: string[];
};

export type ExchangeView = {
  id: string;
  helperId: string;
  helperName: string;
  requesterId: string;
  chosen: boolean;
  requesterDone: boolean;
  helperDone: boolean;
  completedAt: string | null;
  thankYou: string | null;
  viewerRecommended: boolean;
  codeWord: string | null;
  childLine: string | null;
  parentPhone: string | null;
};

export type ReplyView = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  held: boolean;
};

export type PostView = {
  id: string;
  kind: "need" | "offer" | "gather" | "update";
  topic: string | null;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  expiresAt: string | null;
  held: boolean;
  pendingChild: string | null;
  replies: ReplyView[];
  rsvpNames: string[];
  viewerIn: boolean;
  viewerChoice: "in" | "out" | null;
  exchanges: ExchangeView[];
  safetyNotice: boolean;
};

export type OfferView = {
  id: string;
  firstName: string;
  weekday: string;
  start: string;
  end: string;
  note: string;
};

export type ForecastView = {
  summary: string;
  helperName: string | null;
  busyLabel: string;
  pickupLabel: string;
};

export type GroupPageData = {
  me: { id: string; firstName: string; helpGiven: number; helpReceived: number };
  group: {
    id: string;
    name: string;
    neighborhood: string;
    purpose: string;
    status: "active" | "paused";
    held: boolean;
    warnDays: number | null;
    suggestSplit: boolean;
    mergeNames: string[];
    helpThisMonth: number;
    memberCount: number;
    cap: number;
  };
  members: MemberView[];
  codes: { code: string; uses: number; maxUses: number; expiresAt: string }[];
  otherGroups: { id: string; name: string }[];
  posts: PostView[];
  freeTimes: OfferView[];
  forecast: ForecastView[];
  calendarNote: string;
};
