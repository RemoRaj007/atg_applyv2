const notFound = (req, res) => {
  res.status(404).json({ status: false, message: `Route ${req.originalUrl} not found` });
};

module.exports = notFound;
