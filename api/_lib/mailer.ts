import nodemailer from "nodemailer";

export interface MailerConfig {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  adminTo: string;
  allowedRecipients: Set<string>;
}

function envBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  return value.trim().toLowerCase() === "true";
}

export function getMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim().toLowerCase() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.MAIL_FROM?.trim() || user;
  const adminTo =
    process.env.MAIL_ADMIN_TO?.trim().toLowerCase() ||
    process.env.SMTP_USER?.trim().toLowerCase() ||
    "";
  const explicitAllowed = (process.env.EMAIL_ALLOWED_RECIPIENTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedRecipients = new Set(
    [user, adminTo, ...explicitAllowed].filter(Boolean),
  );

  return {
    configured:
      Boolean(host && user && pass && from && adminTo) &&
      Number.isInteger(port) &&
      port > 0 &&
      port <= 65535,
    host,
    port,
    secure: envBoolean(process.env.SMTP_SECURE, port === 465),
    user,
    pass,
    from,
    adminTo,
    allowedRecipients,
  };
}

export async function sendConfiguredMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ messageId: string }> {
  const config = getMailerConfig();
  if (!config.configured) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { messageId: info.messageId };
}
