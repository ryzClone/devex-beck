const logger = require("../utils/logger");

const { getDashboardStats , adminpanelExportToExcelService} = require("../services/AdminPanelService");

// --- Analytics Controller ---
const getDashboardAnalytics = async (req, res) => {
  const { interval } = req.query; // daily | weekly | monthly

  try {
    logger.info(`[DashboardAnalytics] So‘rov qabul qilindi. interval=${interval}`);

    const stats = await getDashboardStats(interval);

    logger.info(`[DashboardAnalytics] ✅ Statistika olindi. Result: ${JSON.stringify(stats)}`);

    res.status(200).json(stats);
  } catch (error) {
    logger.error(`[DashboardAnalytics] ❌ Xato: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: error.message });
  }
};
// --- controller ---
const adminpanelExportToExcel = async (req, res) => {
  const { from, to, tableName } = req.body;

  try {
    logger.info(
      `[ExcelExport] Yangi so‘rov qabul qilindi. Parametrlar: from=${from}, to=${to}, tableName=${tableName}`
    );

    logger.info("[ExcelExport] Serviceni chaqiryapmiz...");
    const fileBuffer = await adminpanelExportToExcelService(from, to, tableName);

    logger.info(
      `[ExcelExport] Service'dan buffer keldi. Buffer uzunligi: ${fileBuffer?.length || 0}`
    );

    // Headerlarni o‘rnatamiz
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${tableName || "data"}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    logger.info("[ExcelExport] Headerlar o‘rnatildi. Fayl yuborilmoqda...");

    // Faylni yuboramiz
    res.end(fileBuffer);

    logger.info("[ExcelExport] ✅ Fayl yuborildi!");
  } catch (error) {
    // ❌ Xatoni loggerga yozamiz
    logger.error(`[ExcelExport] ❌ Xato: ${error.message}`, { stack: error.stack });

    // Foydalanuvchiga javob qaytaramiz
    res.status(500).json({ error: error.message });
  }
};





module.exports = {
  getDashboardAnalytics,
  adminpanelExportToExcel
};
