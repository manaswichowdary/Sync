export type LoginLinkFailure = {
  message?: string;
  status?: number;
  code?: string;
};

const WAIT = "Please wait a minute, then ask for a new code.";
const MAIL = "Our email service had a problem. Please try again in a few minutes.";

function redactContact(message: string): string {
  return message
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
}

function detail(error: LoginLinkFailure): string {
  return `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase().replace(/_/g, " ");
}

function isRateLimit(error: LoginLinkFailure, text: string): boolean {
  return error.status === 429 || text.includes("rate limit") || text.includes("after 60 seconds");
}

function isEmailService(text: string): boolean {
  if (text.includes("smtp") || text.includes("email provider")) return true;
  return text.includes("error sending") && /email|mail|magic link/.test(text);
}

/** Log the real Supabase failure, then pick the note a person should see. */
export function loginLinkMessage(error: LoginLinkFailure, fallback: string): string {
  const status = typeof error.status === "number" ? error.status : null;
  const code = typeof error.code === "string" ? error.code : null;
  const message = typeof error.message === "string" ? error.message : "";
  console.error("LOGIN LINK ERROR:", { status, code, message: redactContact(message) });

  const text = detail(error);
  if (isRateLimit(error, text)) return WAIT;
  if (isEmailService(text)) return MAIL;
  return fallback;
}
