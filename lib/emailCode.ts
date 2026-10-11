export const EMAIL_CODE_LABEL = "Type the code from the email";
export const EMAIL_LINK_NOTE = "You can also open the link.";
export const EMAIL_CODE_NOTE = `${EMAIL_CODE_LABEL}. ${EMAIL_LINK_NOTE}`;

export function noteAfterCode(message: string): string {
  if (!message.startsWith(EMAIL_CODE_NOTE)) return "";
  return message.slice(EMAIL_CODE_NOTE.length).trim();
}

export type EmailCodeClient = {
  auth: {
    verifyOtp: (args: { email: string; token: string; type: "email" }) => Promise<{
      error: { message?: string; code?: string } | null;
    }>;
  };
};

export function normalizeEmailCode(token: string): string | null {
  const digits = token.replace(/\s/g, "");
  return /^\d{6,10}$/.test(digits) ? digits : null;
}

export function emailCodeError(error: { message?: string; code?: string }): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  const expired = code === "otp_expired" || message.includes("expired");
  const invalid = message.includes("invalid") || message.includes("not valid");
  if (expired && invalid) return "That code is wrong or expired.";
  if (expired) return "That code has expired.";
  if (invalid) return "That code is not right.";
  return "That code did not work. Check the email and try again.";
}

/** Same landing page the email link uses, including a new group on /start. */
export function destinationAfterLogin(path: string, afterStart: boolean): string {
  if (afterStart && path === "/") return "/start";
  return path;
}

export async function verifyEmailCode(supabase: EmailCodeClient, email: string, token: string) {
  const code = normalizeEmailCode(token);
  if (!code) return { ok: false as const, error: "Enter the code from the email.", resend: false as const };
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { ok: false as const, error: emailCodeError(error), resend: true as const };
  return { ok: true as const };
}
