import {
  CODE_DEFAULT_MAX_USES,
  CODE_EXPIRY_DAYS,
  GROUP_CREATE_COOLDOWN_DAYS,
  GROUP_HARD_CAP,
  GROUP_MID_CAP,
  GROUP_START_CAP,
  GROW_TO_150_AFTER,
  GROW_TO_60_AFTER,
  INACTIVE_DAYS,
  INACTIVE_WARN_DAYS,
  MAX_GROUPS_PER_USER,
  MEMBER_OVERLAP_SHARE,
  THIRD_GROUP_AFTER_EXCHANGES,
  UPDATE_EXPIRY_DAYS,
  WRONG_CODE_LOCKOUT,
} from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

export type GroupPurpose = "building" | "school" | "street" | "other";
export type GroupStatus = "active" | "paused";

export type ExistingGroup = {
  id: string;
  name: string;
  neighborhood: string;
  purpose: string;
  memberCount: number;
  confirmedExchanges: number;
};

export type NewGroupDraft = {
  name: string;
  neighborhood: string;
  purpose: string;
};

export type CreateReview = {
  similar: ExistingGroup[];
  allowCreateAnyway: boolean;
  message: string;
};

export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function labelsSimilar(a: string, b: string): boolean {
  const left = normalizeLabel(a);
  const right = normalizeLabel(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((word) => word.length > 2));
  const rightTokens = new Set(right.split(" ").filter((word) => word.length > 2));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return shared / Math.min(leftTokens.size, rightTokens.size) >= 0.5;
}

export function memberCap(confirmedExchanges: number): number {
  if (confirmedExchanges >= GROW_TO_150_AFTER) return GROUP_HARD_CAP;
  if (confirmedExchanges >= GROW_TO_60_AFTER) return GROUP_MID_CAP;
  return GROUP_START_CAP;
}

export function capStatus(memberCount: number, confirmedExchanges: number): {
  cap: number;
  full: boolean;
  suggestSplit: boolean;
} {
  const cap = memberCap(confirmedExchanges);
  return {
    cap,
    full: memberCount >= cap,
    suggestSplit: memberCount >= GROUP_HARD_CAP,
  };
}

export function isGroupFull(memberCount: number, confirmedExchanges: number): boolean {
  return capStatus(memberCount, confirmedExchanges).full;
}

/** Suggest joining when the name and neighborhood match. Creating anyway is allowed when every match is full or has a different purpose. */
export function reviewNewGroup(draft: NewGroupDraft, existing: ExistingGroup[]): CreateReview {
  const similar = existing.filter(
    (group) =>
      labelsSimilar(group.name, draft.name) &&
      labelsSimilar(group.neighborhood, draft.neighborhood)
  );
  if (similar.length === 0) {
    return { similar, allowCreateAnyway: true, message: "" };
  }
  const blocking = similar.filter(
    (group) => group.purpose === draft.purpose && !isGroupFull(group.memberCount, group.confirmedExchanges)
  );
  const names = similar.map((group) => group.name).join(", ");
  if (blocking.length > 0) {
    return {
      similar,
      allowCreateAnyway: false,
      message: `${names} already covers this neighborhood. Ask for a code and join that group.`,
    };
  }
  return {
    similar,
    allowCreateAnyway: true,
    message: `${names} is similar, and you can still create this one because that group is full or the purpose is different.`,
  };
}

export function canAddGroup(membershipsInJoinOrder: { confirmedExchanges: number }[]): {
  allowed: boolean;
  reason: string;
} {
  if (membershipsInJoinOrder.length < MAX_GROUPS_PER_USER) {
    return { allowed: true, reason: "" };
  }
  if (membershipsInJoinOrder.length > MAX_GROUPS_PER_USER) {
    return { allowed: false, reason: "This account cannot join another group." };
  }
  const ready = membershipsInJoinOrder.every(
    (group) => group.confirmedExchanges >= THIRD_GROUP_AFTER_EXCHANGES
  );
  if (ready) return { allowed: true, reason: "" };
  return {
    allowed: false,
    reason: `A third group opens after each of your first two groups has ${THIRD_GROUP_AFTER_EXCHANGES} confirmed exchanges.`,
  };
}

export function createCooldown(lastCreatedAt: Date | null, now: Date): {
  allowed: boolean;
  availableAt: Date | null;
} {
  if (!lastCreatedAt) return { allowed: true, availableAt: null };
  const availableAt = new Date(lastCreatedAt.getTime() + GROUP_CREATE_COOLDOWN_DAYS * DAY_MS);
  if (now.getTime() >= availableAt.getTime()) return { allowed: true, availableAt: null };
  return { allowed: false, availableAt };
}

export type ActivityState = "active" | "warn" | "paused";

export function activityState(lastActivityAt: Date, now: Date): ActivityState {
  const idleDays = (now.getTime() - lastActivityAt.getTime()) / DAY_MS;
  if (idleDays >= INACTIVE_DAYS) return "paused";
  if (idleDays >= INACTIVE_DAYS - INACTIVE_WARN_DAYS) return "warn";
  return "active";
}

export function daysUntilPause(lastActivityAt: Date, now: Date): number {
  const idleDays = (now.getTime() - lastActivityAt.getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(INACTIVE_DAYS - idleDays));
}

/** A new post or confirmed exchange turns a paused group back on. Time alone does not. */
export function nextGroupStatus(
  current: GroupStatus,
  lastActivityAt: Date,
  now: Date,
  hadNewActivity: boolean
): GroupStatus {
  if (hadNewActivity) return "active";
  if (current === "paused") return "paused";
  return activityState(lastActivityAt, now) === "paused" ? "paused" : "active";
}

/** True when most members of both groups are the same people. */
export function shouldSuggestMerge(groupA: string[], groupB: string[]): boolean {
  if (groupA.length === 0 || groupB.length === 0) return false;
  const other = new Set(groupB);
  const shared = groupA.filter((id) => other.has(id)).length;
  return shared / groupA.length > MEMBER_OVERLAP_SHARE && shared / groupB.length > MEMBER_OVERLAP_SHARE;
}

export function wrongCodeLocked(tries: number): boolean {
  return tries >= WRONG_CODE_LOCKOUT;
}

export function codeUsable(input: {
  uses: number;
  maxUses: number;
  expiresAt: Date;
  groupStatus: GroupStatus;
  held: boolean;
  now: Date;
}): { ok: boolean; reason: string } {
  if (input.held) return { ok: false, reason: "This group is on hold, so the code is on hold too." };
  if (input.groupStatus !== "active") {
    return { ok: false, reason: "This group is paused, so the code is paused too." };
  }
  if (input.now.getTime() >= input.expiresAt.getTime()) {
    return { ok: false, reason: "This code has expired." };
  }
  if (input.uses >= input.maxUses) {
    return { ok: false, reason: "This code has reached its maximum uses." };
  }
  return { ok: true, reason: "" };
}

export function codeExpiresAt(now: Date, days = CODE_EXPIRY_DAYS): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

export function clampCodeMaxUses(requested: number): number {
  if (!Number.isFinite(requested) || requested < 1) return CODE_DEFAULT_MAX_USES;
  return Math.min(CODE_DEFAULT_MAX_USES, Math.floor(requested));
}

export function clampCodeDays(requested: number): number {
  if (!Number.isFinite(requested) || requested < 1) return CODE_EXPIRY_DAYS;
  return Math.min(CODE_EXPIRY_DAYS, Math.floor(requested));
}

export function updateExpiresAt(now: Date): Date {
  return new Date(now.getTime() + UPDATE_EXPIRY_DAYS * DAY_MS);
}

/** Safety notices for an exchange stay visible even when a thread or category is muted. */
export function threadVisible(input: {
  muted: boolean;
  left: boolean;
  categoryEnabled: boolean;
  userInExchange: boolean;
}): boolean {
  if (input.userInExchange) return true;
  if (input.muted || input.left || !input.categoryEnabled) return false;
  return true;
}
