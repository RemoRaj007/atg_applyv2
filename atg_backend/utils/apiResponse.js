const sendSuccess = (res, { statusCode = 200, message = "Success", data } = {}) => {
  return res.status(statusCode).json({ status: true, message, data });
};

module.exports = { sendSuccess };
