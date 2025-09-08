const express = require("express");
const {
  login,
} = require("../controllers/AuthController");
const authenticateToken = require("../middlewares/authMiddleware");
const { uploadExcel, upload, downloadFile, uploadFile, exportTableToExcel, exportFilteredUserhistoryTableToExcel, exportHistoryToExcelFromRecords  } = require("../controllers/ExcelController");
const { addUser, readUsers, editStatusUser, userDelete, userUpdate, userEditPassword } = require("../controllers/UserController");
const { moveToRepair, moveToUnused, moveToEquipment, addEquipment, readEquipment, updateEquipment } = require("../controllers/TexnikaController");
const { readTransfers, addTransferedData, sendTransferData, readAcception } = require("../controllers/TransferController");
const { readHistory, readUserHistory, readEquipmentHistory } = require("../controllers/HistoryController");
const { sendPdf, updatePdf, updatePdfTransfer } = require("../controllers/PdfController");
const { getDashboardAnalytics, AdminpanelExportToExcel, adminpanelExportToExcel } = require("../controllers/AdminPanelController");
const { getAllPositions, createPosition, updatePosition, deletePosition } = require("../controllers/PositionController");
const { getAllSupportEmployees, createSupportEmployee, updateSupportEmployee, deleteSupportEmployee } = require("../controllers/EmployeeSupportController");
const { getAllOperatingSystems, createOperatingSystem, updateOperatingSystem, deleteOperatingSystem } = require("../controllers/OperatingSystemController");
const InstalledSoftwareController = require("../controllers/InstalledSoftwareController");
const { getAllInstalledSoftwareService } = require("../services/InstalledSoftwareService");

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
router.get("/readtexnika", authenticateToken, readEquipment);
router.put("/updatetexnika", authenticateToken, updateEquipment);
router.post("/addtexnika", authenticateToken, addEquipment);
router.post("/movetorepair", authenticateToken, moveToRepair);
router.post("/movetounused", authenticateToken, moveToUnused);
router.post("/movetotexnika", authenticateToken, moveToEquipment);
// acception
router.get("/readacception", authenticateToken, readAcception);
// transfered
router.get("/readtransfers", authenticateToken, readTransfers);

// History
router.get("/history", authenticateToken, readHistory);
router.get("/userhistory", authenticateToken, readUserHistory);
router.get("/equipmenthistory" , authenticateToken , readEquipmentHistory)
router.get("/download/:filePath", downloadFile);

// word file send 
router.post('/sendpdf', authenticateToken , sendPdf);
router.post('/updatePdf' , authenticateToken , updatePdf);
router.post('/updatePdftransfer' , authenticateToken , updatePdfTransfer);

// Transfered add
router.post('/addTransfered', authenticateToken , addTransferedData);

// Transfered add
router.post('/sendtransfered', authenticateToken , sendTransferData);

// Upload file
router.post('/upload', authenticateToken , uploadFile);

// Upload excel file
router.post("/upload-excel", upload.single("file"), authenticateToken , uploadExcel);
router.get('/export-excel/:table' , authenticateToken , exportTableToExcel);
router.post("/export-userhistory/filtered/:table", exportFilteredUserhistoryTableToExcel);
router.post("/export-history/filtered/:table", exportHistoryToExcelFromRecords);

// AdminPanel
router.get("/admin-panel/stats", authenticateToken , getDashboardAnalytics );
router.post("/adminpanel-export", authenticateToken , adminpanelExportToExcel );
// --- Routes for Positon ---
router.get("/viewposition", authenticateToken , getAllPositions);
router.post("/createposition", authenticateToken , createPosition);
router.put("/updateposition/:id", authenticateToken , updatePosition);
router.delete("/deleteposition/:id", authenticateToken , deletePosition);
// --- Routes for SupportEmployee ---
router.get("/viewemployeesupport", authenticateToken , getAllSupportEmployees);
router.post("/createemployeesupport", authenticateToken , createSupportEmployee);
router.put("/updateemployeesupport/:id", authenticateToken , updateSupportEmployee);
router.delete("/deleteemployeesupport/:id", authenticateToken , deleteSupportEmployee);
// --- Routes for OperatingSystem ---
router.get("/viewoperatingsystem", authenticateToken, getAllOperatingSystems);
router.post("/createoperatingsystem", authenticateToken, createOperatingSystem);
router.put("/updateoperatingsystem/:id", authenticateToken, updateOperatingSystem);
router.delete("/deleteoperatingsystem/:id", authenticateToken, deleteOperatingSystem);

// --- Routes for InstalledSoftware ---
router.get("/viewinstalledsoftware", authenticateToken, InstalledSoftwareController.getAllInstalledSoftware);
router.get("/viewinstalledsoftware/:id", authenticateToken, InstalledSoftwareController.getByIdInstalledSoftware);
router.post("/createinstalledsoftware", authenticateToken, InstalledSoftwareController.createInstalledSoftware);
router.put("/updateinstalledsoftware/:id", authenticateToken, InstalledSoftwareController.updateInstalledSoftware);
router.delete("/deleteinstalledsoftware/:id", authenticateToken, InstalledSoftwareController.deleteInstalledSoftware);
module.exports = router;
