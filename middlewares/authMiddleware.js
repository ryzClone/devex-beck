const { verifyToken } = require("../config/jwt");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.sendStatus(403);
  }
};

module.exports = authenticateToken;
