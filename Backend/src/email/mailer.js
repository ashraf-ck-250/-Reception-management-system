const nodemailer = require("nodemailer");
const { getLogoAttachment } = require("./branding");

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? String(rawPass).replace(/\s+/g, "") : "";

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass }
  });
}

async function sendMail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] Skipped: set SMTP_HOST, SMTP_USER, and SMTP_PASS in Backend/.env");
    return { ok: false, skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const logoAtt = getLogoAttachment();
  const attachments = logoAtt ? [logoAtt] : undefined;
  try {
    await transport.sendMail({ from, to, subject, html, attachments });
    return { ok: true };
  } catch (err) {
    console.error("[email] sendMail failed:", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = { sendMail };

