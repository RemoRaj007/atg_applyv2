const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { sendEmail } = require("../notifications/email.service");
const { systemLogger } = require("../../config/atg_logger");

const submit = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  const to = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (to) {
    await sendEmail({
      to,
      subject: `[ATG Apply Contact] ${subject}`,
      body: `From: ${name} <${email}>\n\n${message}`,
    });
  } else {
    systemLogger.warn("Contact form submitted but no CONTACT_EMAIL/EMAIL_FROM configured", { name, email, subject });
  }

  return sendSuccess(res, { message: "Message received. We'll get back to you soon." });
});

module.exports = { submit };
