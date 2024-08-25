const express = require("express");
const {
  login,
  addUser,
  readUsers,
  editStatus,
} = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/adduser", authenticateToken, addUser);
router.get("/readuser", authenticateToken, readUsers);
router.put("/editstatus", authenticateToken, editStatus);

module.exports = router;
