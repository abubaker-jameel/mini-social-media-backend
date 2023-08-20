const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (token) {
    jwt.verify(token, process.env.API_SECRET, (error, decoded) => {
      if (error) {
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = decoded;
      next();
    });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};
module.exports = verifyToken;
