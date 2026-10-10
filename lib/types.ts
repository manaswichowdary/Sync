export type Board = "help" | "share" | "gather" | "street";

export type TrustLevel = "new" | "invited" | "met";

export type Post = {
  id: string;
  board: Board;
  text: string;
  authorFirstName: string;
  area: string; // neighborhood name only, never an address
  lat: number; // rounded on purpose, never a real doorstep
  lng: number;
  distanceMiles: number; // distance from the demo viewer
  kidsAges: number[];
  times: string[]; // e.g. "sat-am", "weekday-pm"
  publicOnly: boolean;
  trust: TrustLevel;
  metCount: number;
  invitedBy?: string;
  confirmations?: number; // street updates only
  lastConfirmedMinutesAgo?: number; // street updates only
};

export type FindingType =
  | "child_name"
  | "school"
  | "address"
  | "home_area"
  | "phone"
  | "email"
  | "routine"
  | "appearance"
  | "money";

export type Finding = {
  type: FindingType;
  found: string; // the text that triggered the rule
  why: string; // plain language reason shown to the parent
  replacement: string | null; // null means "needs the parent's edit"
};

export type GuardResult = {
  findings: Finding[];
  safeText: string;
  risky: boolean;
  needsManualEdit: boolean;
};

export type MatchRequest = {
  board: Board;
  kidsAges: number[];
  times: string[];
  publicOnly: boolean;
};

export type MatchResult = {
  post: Post;
  reasons: string[];
};
