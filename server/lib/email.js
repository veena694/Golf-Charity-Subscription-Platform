let transporterPromise = null;

function isEmailEnabled() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

async function getTransporter() {
  if (!isEmailEnabled()) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then(({ default: nodemailer }) =>
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    );
  }

  return transporterPromise;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    return { delivered: false, reason: "missing-recipient" };
  }

  const transporter = await getTransporter();
  if (!transporter) {
    console.log("EMAIL DISABLED:", { to, subject });
    return { delivered: false, reason: "email-disabled" };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true };
}

async function sendWelcomeEmail({ email, fullName }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  return sendEmail({
    to: email,
    subject: "Welcome to GolfFlow",
    text: `Hi ${firstName}, your GolfFlow account is ready. Log in to choose your charity, add your latest five Stableford scores, and enter the monthly draw.`,
    html: `<p>Hi ${firstName},</p><p>Your GolfFlow account is ready.</p><p>Log in to choose your charity, add your latest five Stableford scores, and enter the monthly draw.</p>`,
  });
}

async function sendSubscriptionEmail({ email, fullName, planType, endDate }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  return sendEmail({
    to: email,
    subject: "Your GolfFlow subscription is active",
    text: `Hi ${firstName}, your ${planType || "GolfFlow"} subscription is active. Your renewal or end date is ${endDate || "now available in your dashboard"}.`,
    html: `<p>Hi ${firstName},</p><p>Your <strong>${planType || "GolfFlow"}</strong> subscription is active.</p><p>Your renewal or end date is <strong>${endDate || "now available in your dashboard"}</strong>.</p>`,
  });
}

async function sendSubscriptionStatusEmail({ email, fullName, status, endDate }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  return sendEmail({
    to: email,
    subject: `GolfFlow subscription update: ${status}`,
    text: `Hi ${firstName}, your subscription status is now ${status}. ${endDate ? `Current period end: ${endDate}.` : ""}`,
    html: `<p>Hi ${firstName},</p><p>Your subscription status is now <strong>${status}</strong>.</p>${endDate ? `<p>Current period end: <strong>${endDate}</strong>.</p>` : ""}`,
  });
}

async function sendDrawPublishedEmail({ email, fullName, drawDate, drawNumbers, totalPoolAmount }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  return sendEmail({
    to: email,
    subject: "A new GolfFlow draw has been published",
    text: `Hi ${firstName}, the monthly draw for ${drawDate} is live. Numbers: ${drawNumbers.join(", ")}. Prize pool: GBP ${Number(totalPoolAmount || 0).toFixed(2)}.`,
    html: `<p>Hi ${firstName},</p><p>The monthly draw for <strong>${drawDate}</strong> is live.</p><p>Numbers: <strong>${drawNumbers.join(", ")}</strong><br />Prize pool: <strong>GBP ${Number(totalPoolAmount || 0).toFixed(2)}</strong></p>`,
  });
}

async function sendWinnerVerificationEmail({ email, fullName, status, amount }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  const amountText = Number.isFinite(Number(amount))
    ? `Payout amount: GBP ${Number(amount).toFixed(2)}.`
    : "";

  return sendEmail({
    to: email,
    subject: `GolfFlow winner verification ${status}`,
    text: `Hi ${firstName}, your winner proof has been ${status}. ${amountText}`,
    html: `<p>Hi ${firstName},</p><p>Your winner proof has been <strong>${status}</strong>.</p><p>${amountText}</p>`,
  });
}

async function sendPayoutEmail({ email, fullName, amount }) {
  const firstName = String(fullName || "Member").trim().split(" ")[0];
  return sendEmail({
    to: email,
    subject: "Your GolfFlow payout has been marked as paid",
    text: `Hi ${firstName}, your payout of GBP ${Number(amount || 0).toFixed(2)} has been marked as paid.`,
    html: `<p>Hi ${firstName},</p><p>Your payout of <strong>GBP ${Number(amount || 0).toFixed(2)}</strong> has been marked as paid.</p>`,
  });
}

module.exports = {
  isEmailEnabled,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendSubscriptionStatusEmail,
  sendDrawPublishedEmail,
  sendWinnerVerificationEmail,
  sendPayoutEmail,
};
