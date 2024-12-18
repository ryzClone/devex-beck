const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

// Generate token
const generateToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
    expiresIn: "1h",  // Token expiration time
  });
};

// Verify token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded; // Token is valid
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error("Token verification failed");
    }
  }
};


module.exports = { generateToken, verifyToken };
