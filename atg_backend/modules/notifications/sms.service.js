const axios = require("axios");
const { systemLogger } = require("../../config/atg_logger");

const buildSmsPayload = (recipientPhone, textContent) => ({
  data: textContent,
  phoneNumber: recipientPhone,
  sIDCode: process.env.SMS_SID,
  userName: process.env.SMS_USERNAME,
  password: process.env.SMS_PASSWORD,
});

async function sendSms({ phone, message }) {
  const targetUrl = process.env.SMS_API_URL;
  if (!targetUrl) {
    systemLogger.warn("SMS not sent: SMS_API_URL is not configured", { phone });
    return false;
  }

  try {
    const requestOptions = {
      method: "POST",
      url: targetUrl,
      data: buildSmsPayload(phone, message),
    };
    const { data: resData } = await axios.request(requestOptions);

    if (Boolean(resData && resData.status)) {
      systemLogger.info("SMS sent", { phone });
      return true;
    }

    systemLogger.warn("SMS gateway rejected message", { phone, response: resData });
    return false;
  } catch (exception) {
    systemLogger.error("Failed to send SMS", { phone, error: exception.message });
    return false;
  }
}

module.exports = { sendSms };
