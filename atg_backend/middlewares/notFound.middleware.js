// The requested path is deliberately not echoed back: it is attacker-controlled
// text, and reflecting it makes this endpoint a convenient carrier for payloads
// aimed at whatever eventually renders the message.
const notFound = (req, res) => {
  res.status(404).json({ status: false, message: "Route not found" });
};

module.exports = notFound;
