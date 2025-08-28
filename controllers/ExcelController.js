const multer = require("multer");
const fs = require("fs");
const { processExcel, FileService } = require("../services/excelService");
const logger = require("../utils/logger");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadExcel = async (req, res) => {
  const username = req.body.username;
  const file = req.file;

  // Loglash
  logger.info(`Полученное имя пользователя: ${username}`);
  logger.info(`Полученный файл: ${file ? file.originalname : 'Нет файла'}`);

  // Tekshiruv
  if (!file) {
    logger.info("Файл не загружен");
    return res.status(400).json({ message: "Файл не загружен" });
  }

  if (!username) {
    logger.error("Имя пользователя не указано!");
    return res.status(400).json({ message: "Имя пользователя не указано!" });
  }

  // Servisga uzatish
  const errorList = await processExcel(file.buffer, req, username);

  if (errorList.length > 0) {
    logger.error("Обнаружены ошибки в некоторых строках:", { errors: errorList });
    return res.status(400).json({
      message: "Обнаружены ошибки в некоторых строках.",
      errors: errorList,
    });
  }

  logger.info("Данные успешно загружены в базу");
  res.json({ message: "Данные успешно загружены в базу" });
};

module.exports = { uploadExcel };

const downloadFile = async (req, res) => {
  const { filePath } = req.params;
  await FileService.handleDownload(filePath, res); // try-catch ham serviseda
};


const uploadFile = (req, res) => {
  FileService.handleUpload(req, res); // Servicega murojaat qilish
};

async function exportTableToExcel(req, res) {
  const { table } = req.params;
  const { start, end } = req.query;
  

  FileService.handleExportToExcel(table, { start, end }, res);
}

async function exportFilteredUserhistoryTableToExcel(req, res) {  
  await FileService.handleExportFilteredToExcelUserhistory(req.body, res);
}

async function exportHistoryToExcelFromRecords(req, res) {    
  await FileService.exportHistoryToExcelFromRecords(req.body, res);
}


module.exports = { upload, uploadExcel, downloadFile, uploadFile , exportTableToExcel , exportFilteredUserhistoryTableToExcel , exportHistoryToExcelFromRecords};
