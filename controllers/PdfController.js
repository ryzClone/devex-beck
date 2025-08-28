const pdfService = require("../services/pdfService");
const logger = require("../utils/logger");

// acception funcsiya
const updatePdf = async (req, res) => {
  const jsonData = req.body;

  if (!jsonData || Object.keys(jsonData).length === 0) {
    logger.error("[updatePdf] Данные в формате JSON не предоставлены.");
    return res.status(400).send("Данные в формате JSON не предоставлены.");
  }

  logger.info("[updatePdf] Получены данные для генерации PDF.");
  
  pdfService
    .generatePdf(jsonData)
    .then(() => {
      logger.info("[updatePdf] PDF успешно создан и отправлен пользователю.");
      res.status(200).send("PDF успешно создан.");
    })
    .catch((error) => {
      logger.error(`[updatePdf] Ошибка при создании PDF: ${error}`);
      res.status(500).send("Ошибка при создании PDF.");
    });
};

// transferfuncsiya
const updatePdfTransfer = async (req, res) => {
  const jsonData = req.body;

  if (!jsonData || Object.keys(jsonData).length === 0) {
    logger.error("[updatePdfTransfer] Данные для создания PDF не предоставлены.");
    return res.status(400).send({ message: "Данные не предоставлены." });
  }

  logger.info("[updatePdfTransfer] Начало создания PDF-документа передачи...");

  pdfService.generateTransferPdf(jsonData)
    .then((outputFilePath) => {
      logger.info("[updatePdfTransfer] PDF-документ передачи успешно создан.");
      res.status(200).send({
        message: "PDF-документ передачи успешно создан.",
        filePath: outputFilePath,
      });
    })
    .catch((error) => {
      logger.error(`[updatePdfTransfer] Ошибка при создании PDF-документа передачи: ${error}`);
      res.status(500).send({ message: "Ошибка при создании PDF-документа передачи." });
    });
};

const sendPdf = (req, res) => {
  const fileName = req.body.fileName;

  logger.info("[sendPdf] Kiruvchi so‘rov (req.body):", req.body);

  if (!fileName) {
    logger.error("[sendPdf] Имя файла не указано в запросе.");
    return res.status(400).json({ error: "Имя файла не указано." });
  }

  const pdfUrl = pdfService.generatePdfUrl(fileName);

  logger.info(`[sendPdf] Ссылка на PDF успешно сгенерирована: ${pdfUrl}`);

  const responsePayload = { pdfUrl };

  logger.info("[sendPdf] Yuborilayotgan javob (res.json):", responsePayload);

  res.json(responsePayload);
};



module.exports = {
  sendPdf,
  updatePdf,
  updatePdfTransfer,
};
