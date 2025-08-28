const historyService = require("../services/HistoryService");
const logger = require('../utils/logger');

const readHistory = async (req, res) => {
  const { page, size, search, filter, equipment_id , user_id } = req.query;

  const result = await historyService.Historyview({
    page: parseInt(page) || 1,
    size: parseInt(size) || 10,
    search,
    filter,
    equipment_id,
    user_id,
  });

  if (result.error) {
    return res.status(500).json({
      message: "Ошибка сервера",
      error: result.error,
    });
  }

  res.status(200).json({
    message: "История успешно получена",
    data: result.data,
    total: result.total,
  });
};


const readUserHistory = async (req, res) => {
  const { page = 1, size = 10, search = "", user = "", user_id = "" } = req.query;

  const result = await historyService.UserHistoryView({ page, size, search, user, user_id });

  if (result.error) {
    return res.status(500).json({ message: "Ошибка сервера", error: result.error });
  }

  res.status(200).json({
    message: "История пользователя успешно получена",
    data: result.data,
    total: result.total,
  });
};

const readEquipmentHistory = async (req, res) => {
  const { page = 1, size = 10, search = "", user = "", user_id = "" , intity_id = ""} = req.query;

  logger.info("GET /equipmenthistory so‘rovi qabul qilindi", {
    endpoint: "/equipmenthistory",
    method: req.method,
    query: req.query,
    requestedBy: req.user?.id || "Noma'lum foydalanuvchi",
  });

  const result = await historyService.EquipmentHistoryView({
    page: parseInt(page),
    size: parseInt(size),
    search,
    user,
    user_id,
    intity_id,
  });

  if (result.error) {
    logger.error("GET /equipmenthistory - Xatolik yuz berdi", {
      query: req.query,
      error: result.error,
      status: 500,
      requestedBy: req.user?.id || "Noma'lum foydalanuvchi",
    });

    return res.status(500).json({
      message: "Ошибка сервера",
      error: result.error,
    });
  }

  logger.info("GET /equipmenthistory - Ma'lumot muvaffaqiyatli olindi", {
    query: req.query,
    totalRecords: result.total,
    status: 200,
    requestedBy: req.user?.id || "Noma'lum foydalanuvchi",
  });

  res.status(200).json({
    message: "История пользователя успешно получена",
    data: result.data,
    total: result.total,
  });
};


module.exports = {
  readHistory,
  readUserHistory,
  readEquipmentHistory,
};
