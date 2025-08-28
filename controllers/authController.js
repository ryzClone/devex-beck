const AuthService = require("../services/AuthService");

// Controller
const login = async (req, res) => {
  const { username, password } = req.body;
  const result = await AuthService.login(username, password);
  res.status(result.status).json({ message: result.message, data: result.data });
};


module.exports = {
  login,
};
