module.exports = (err, req, res, next) => {
  console.error(err);
  if (err && (err.code === "LIMIT_FILE_SIZE" || err.message === "Unsupported file type")) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({
    message: process.env.NODE_ENV === "development"
      ? err.message
      : "Internal Server Error",
  });
};
