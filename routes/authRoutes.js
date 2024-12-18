const express = require("express");
const {
  login,
  addUser,
  readUsers,
  editStatusUser,
  userDelete,
  userUpdate,
  readTexnika,
  readHistory,
  downloadFile,
  updateTexnika,
  addTexnika,
  userEditPassword,
  readAcception,
  updatePdf,
  sendPdf,
  addTransferedData,
  uploadFile,
  readTransfers,
  updatePdfTransfer,
  sendTransferData,
  readTexHistory,
  addTexHistory,
  readTexnikaRepair,
  updateTexnikaRepair,
  readTexnikaUnused,
  updateTexnikaUnused,
  moveToRepair,
  moveToUnused,
  moveToTexnika,
} = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();
// Users
router.post("/login", login);
router.post("/adduser", authenticateToken, addUser);
router.get("/readuser", authenticateToken, readUsers);
router.put("/editstatus", authenticateToken, editStatusUser);
router.delete("/deleteuser", authenticateToken, userDelete);
router.put("/updateuser", authenticateToken, userUpdate);
router.put("/updatepassword", authenticateToken, userEditPassword);
// Texnika
router.get("/readtexnika", authenticateToken, readTexnika);
router.put("/updatetexnika", authenticateToken, updateTexnika);
router.post("/addtexnika", authenticateToken, addTexnika);
router.post("/movetorepair", authenticateToken, moveToRepair);
router.post("/movetounused", authenticateToken, moveToUnused);
router.post("/movetotexnika", authenticateToken, moveToTexnika);
// acception
router.get("/readacception", authenticateToken, readAcception);
// acception
router.get("/readtransfers", authenticateToken, readTransfers);

// History
router.get("/history", authenticateToken, readHistory);
router.get("/readtexhistory", authenticateToken, readTexHistory);
router.post("/texhistory", authenticateToken, addTexHistory);
router.get("/download/:filePath", downloadFile);

// word file send 
router.post('/sendpdf', sendPdf);
router.post('/updatePdf' ,updatePdf);
router.post('/updatePdftransfer' , updatePdfTransfer);
// Transfered add
router.post('/addTransfered', addTransferedData);
// Transfered add
router.post('/sendtransfered', sendTransferData);
// Upload file
router.post('/upload', uploadFile);

module.exports = router;
