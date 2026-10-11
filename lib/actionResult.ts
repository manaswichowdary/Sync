export type ShownFinding = { found: string; why: string };

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  safeText?: string;
  findings?: ShownFinding[];
  review?: { allowCreateAnyway: boolean; message: string; names: string[] };
  groupId?: string;
  resend?: boolean;
};
