import nodemailer from "nodemailer";

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM must be configured");
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

export async function sendVerificationEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const { transporter, from } = createTransport();
  const verificationUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from,
    to: email,
    subject: "Confirm your email address",
    text: `Hi ${name},\n\nConfirm your email by visiting this link:\n${verificationUrl}\n\nIf you did not request this account, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Confirm your email by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you did not request this account, you can ignore this email.</p>`,
  });
}
