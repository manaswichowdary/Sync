import { checkPost } from "./guard";
import type { Finding } from "./types";

export type Approval =
  | { ok: true; text: string }
  | { ok: false; error: string; safeText: string; findings: Finding[] };

/** The saved post is the cleaned text, and only after it no longer trips the guard. */
export function approvedText(input: string): Approval {
  const result = checkPost(input.slice(0, 1000));
  if (!result.safeText.trim()) {
    return { ok: false, error: "Write something first.", safeText: "", findings: result.findings };
  }
  if (result.needsManualEdit) {
    return {
      ok: false,
      error: "Edit the highlighted parts, then approve the safer text.",
      safeText: result.safeText,
      findings: result.findings,
    };
  }
  if (result.risky) {
    return {
      ok: false,
      error: "Approve the safer text before posting.",
      safeText: result.safeText,
      findings: result.findings,
    };
  }
  return { ok: true, text: result.safeText };
}
