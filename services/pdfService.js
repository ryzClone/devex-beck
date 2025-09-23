const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

const generatePdf = (jsonData) => {
  return new Promise((resolve, reject) => {
    try {
      logger.info("[generatePdf] Генерация PDF началась...");

      // === Fallback values ===
      const fullName = jsonData.full_name || "Не указано";
      const shortName = jsonData.shortname || "";
      const position = jsonData.position || "";
      const orderName =  jsonData.order_name || "";
      const employeePodrazdelenie = jsonData.employee_podrazdelenie || "";
      const executorPosition = Array.isArray(jsonData.executor_fio)
        ? jsonData.executor_fio.map(e => e.position || "").join(", ")
        : jsonData.executor_position || "";
      const executorFio = Array.isArray(jsonData.executor_fio)
        ? jsonData.executor_fio.map(e => e.fullname).join(", ")
        : jsonData.executor_fio || "";
      const responsiblePosition = Array.isArray(jsonData.responsible_fio)
        ? jsonData.responsible_fio.map(e => e.position || "").join(", ")
        : jsonData.responsible_position || "";
      const responsibleFio = Array.isArray(jsonData.responsible_fio)
        ? jsonData.responsible_fio.map(e => e.fullname).join(", ")
        : jsonData.responsible_fio || "";

      const passportSerialNumber = jsonData.passport_serial_number || "";
      const passportIssueDate = jsonData.passport_issue_date || "";
      const issuedBy = jsonData.issued_by || "";

      const equipments = (jsonData.equipments || []).map(eq => ({
        name: eq.equipment_name || eq.name || "",
        inventory_number: eq.inventory_number || "",
        serial_number: eq.serial_number || "",
      }));

      const additional = (jsonData.additional || []).map(eq => ({
        name: eq.equipment_name || eq.name || "",
        inventory_number: eq.inventory_number || "",
        serial_number: eq.serial_number || "",
      }));

      const softwares = (jsonData.softwares || []).map(sw => ({
        name: sw.name || "",
        installed: sw.installed || false,
      }));

      // === Output file path ===
      const outputDir = path.join(__dirname, "../public/files");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const outputFilePath = path.join(outputDir, "output.pdf");

      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // === Fonts ===
      const fontPathBold = path.join(__dirname, "../fonts/TimesNewRomanPS-BoldMT.ttf");
      const fontPathRegular = path.join(__dirname, "../fonts/timesnewromanpsmt.ttf");

      const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 40, right: 40 }, size: "A4" });
      const writeStream = fs.createWriteStream(outputFilePath);
      doc.pipe(writeStream);

      // === Helper: format date ===
      const formatDate = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = [
          "Января","Февраля","Марта","Апреля","Мая","Июня",
          "Июля","Августа","Сентября","Октября","Ноября","Декабря"
        ];
        return `«${day}» ${month[now.getMonth()]} ${now.getFullYear()} г.`;
      };

      // === HEADER ===
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica")
        .fontSize(12)
        .text(formatDate(), { align: "right" });
      doc.moveDown(3);

      doc.font(fs.existsSync(fontPathBold) ? fontPathBold : "Helvetica-Bold")
        .fontSize(14)
        .text("АКТ ПРИЕМА-ПЕРЕДАЧИ", { align: "center" });
      doc.moveDown(2);

      // === MAIN TEXT ===
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica")
        .fontSize(12)
        .text(
          `Настоящий акт составлен о том, что ${employeePodrazdelenie} следующее: ` +
          `${orderName} ${fullName} (паспорт серия: ${passportSerialNumber} выдан: ${passportIssueDate} ${issuedBy}) ` +
          `получает нижеуказанные устройства.`,
          { align: "justify", indent: 30 }
        );
      doc.moveDown(1);

      doc.text(
        `${responsiblePosition} ${responsibleFio} на предмет приема-передачи нижеуказанной техники:`,
        { align: "justify", indent: 30 }
      );
      doc.moveDown(2);

      // === TABLE ===
      const tableHeaders = ["№", "Наименование техники", "Инвент. номер"];
      const tableWidth = doc.page.width - 80;
      const columnWidths = [0.07 * tableWidth, 0.65 * tableWidth, 0.28 * tableWidth];
      const rowHeight = 25;
      let y = doc.y;

      // headers
      doc.font(fs.existsSync(fontPathBold) ? fontPathBold : "Helvetica-Bold");
      tableHeaders.forEach((header, i) => {
        const x = 40 + columnWidths.slice(0, i).reduce((a,b)=>a+b,0);
        doc.rect(x, y, columnWidths[i], rowHeight).stroke();
        doc.text(header, x, y + 7, { width: columnWidths[i], align: "center" });
      });
      y += rowHeight;

      // equipments
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica");
      equipments.forEach((eq, idx) => {
        const row = [String(idx + 1), eq.name, eq.inventory_number];
        row.forEach((cell, i) => {
          const x = 40 + columnWidths.slice(0, i).reduce((a,b)=>a+b,0);
          doc.rect(x, y, columnWidths[i], rowHeight).stroke();
          doc.text(cell, x + 3, y + 7, { width: columnWidths[i] - 6, align: "center" });
        });
        y += rowHeight;
      });

      // additional
      additional.forEach((item, idx) => {
        const row = [String(equipments.length + idx + 1), item.name, item.inventory_number];
        row.forEach((cell, i) => {
          const x = 40 + columnWidths.slice(0, i).reduce((a,b)=>a+b,0);
          doc.rect(x, y, columnWidths[i], rowHeight).stroke();
          doc.text(cell, x + 3, y + 7, { width: columnWidths[i] - 6, align: "center" });
        });
        y += rowHeight;
      });

      // softwares
      if (softwares.length > 0) {
        const row = [
          String(equipments.length + additional.length + 1),
          "Перечень установленные ПО:\n" +
          softwares.map(s => `${s.name}   ${s.installed ? "+" : "-"}`).join("\n"),
          ""
        ];
        row.forEach((cell, i) => {
          const x = 40 + columnWidths.slice(0, i).reduce((a,b)=>a+b,0);
          const height = 20 + softwares.length * 15;
          doc.rect(x, y, columnWidths[i], height).stroke();
          doc.text(cell, x + 3, y + 7, { width: columnWidths[i]-6, align: "left" });
        });
        y += 20 + softwares.length * 15;
      }

      doc.moveDown(4);

      // === SIGNATURES ===
      const startY = doc.y;
      doc.font(fs.existsSync(fontPathBold) ? fontPathBold : "Helvetica-Bold").text("Передал:", 40, startY);
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica")
        .text(responsiblePosition, 40, startY + 15)
        .text(responsibleFio, doc.page.width - 200, startY + 15);

      const acceptY = startY + 100;
      doc.font(fs.existsSync(fontPathBold) ? fontPathBold : "Helvetica-Bold").text("Принял(а):", 40, acceptY);
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica")
        .text(position, 40, acceptY + 15)
        .text(fullName, doc.page.width - 200, acceptY + 15);

      const execY = acceptY + 100;
      doc.font(fs.existsSync(fontPathBold) ? fontPathBold : "Helvetica-Bold").text("Исполнитель:", 40, execY);
      doc.font(fs.existsSync(fontPathRegular) ? fontPathRegular : "Helvetica")
        .text(executorPosition, 40, execY + 15)
        .text(executorFio, doc.page.width - 200, execY + 15);

      doc.end();

      writeStream.on("finish", () => {
        logger.info(`[generatePdf] PDF успешно создан: ${outputFilePath}`);
        resolve(outputFilePath);
      });
      writeStream.on("error", (err) => {
        logger.error(`[generatePdf] Ошибка записи PDF: ${err}`);
        reject(err);
      });

    } catch (err) {
      logger.error(`[generatePdf] PDF генерация не удалась: ${err}`);
      reject(err);
    }
  });
};


// sendPdfService.js
const generatePdfUrl = (fileName) => {
    if (!fileName) {
        logger.error("[generatePdfUrl] Требуется имя файла!");
        throw new Error('Требуется имя файла');
    }
    const url = `http://localhost:5000/files/${fileName}`;
    logger.info("[generatePdfUrl] Ссылка на PDF успешно сгенерирована:", url);
    return url;
};

const generateTransferPdf = async (jsonData) => {
    return new Promise((resolve, reject) => {
        const outputFilePath = path.join(__dirname, '../public/files', 'output.pdf');
        const fontPath = path.join(__dirname, '../fonts', 'TimesNewRomanPS-BoldMT.ttf');
        const regularFontPath = path.join(__dirname, '../fonts', 'timesnewromanpsmt.ttf');

        logger.info("[generateTransferPdf] Проверка наличия старого PDF файла...");
        if (fs.existsSync(outputFilePath)) {
            logger.info("[generateTransferPdf] Старый PDF файл найден. Удаление...");
            fs.unlinkSync(outputFilePath);
        }

        logger.info("[generateTransferPdf] Создание нового PDF документа...");
        const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 30, right: 30 }, size: 'A4' });
        const writeStream = fs.createWriteStream(outputFilePath);
        doc.pipe(writeStream);

        logger.info("[generateTransferPdf] Форматирование текущей даты...");
        const formatDate = () => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const monthNumber = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const monthsInRussian = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            return `« ${day} » ${monthsInRussian[parseInt(monthNumber, 10) - 1]} ${year}`;
        };

        doc.font(regularFontPath).fontSize(12);
        doc.font(fontPath).fontSize(12).text(formatDate(), { align: 'right' });

        doc.moveDown(5);
        logger.info("[generateTransferPdf] Добавление заголовка...");
        doc.font(fontPath).text('АКТ ПРИЕМА-ПЕРЕДАЧИ', { align: 'center' });
        doc.moveDown(1);

        logger.info("[generateTransferPdf] Запись основного содержания...");
        doc.font(regularFontPath).text(
            `Настоящий акт составлен о том, что Банк передает ${jsonData.division} следующее: ${jsonData.department} ` +
            `${jsonData.full_name} (паспорт: ${jsonData.passport_serial_number}, выдан: ${jsonData.passport_issue_date}, ${jsonData.issued_by}) ` +
            `получает нижеуказанные устройства.`,
            { align: 'left', indent: 40 }
        );

        doc.moveDown(1);
        doc.font(regularFontPath).text(
            'Прием-передачу нижеуказанной техники провел начальник Отдела эксплуатации информационных технологий Сайдалиходжаев Р.Б.',
            { align: 'left', indent: 40 }
        );
        doc.moveDown(2);

        logger.info("[generateTransferPdf] Создание заголовков таблицы...");
        const tableHeaders = ['№', 'Наименование техники', 'Инвент. номер'];
        const tableData = [['1', jsonData.equipment_name, jsonData.inventory_number]];
        const tableWidth = doc.page.width - 60;
        const columnWidths = [0.1 * tableWidth, 0.7 * tableWidth, 0.2 * tableWidth];
        const rowHeight = 20;
        let yPosition = doc.y;

        doc.font(fontPath);
        tableHeaders.forEach((header, index) => {
            const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
            doc.text(header, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });
            doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
        });
        yPosition += rowHeight;

        logger.info("[generateTransferPdf] Заполнение таблицы данными...");
        doc.font(regularFontPath);
        tableData.forEach((row) => {
            row.forEach((cell, index) => {
                const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
                doc.text(cell, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });
                doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
            });
            yPosition += rowHeight;
        });

        logger.info("[generateTransferPdf] Добавление подписей...");
        yPosition += 100;
        doc.font(fontPath).text('Передал:', 30, yPosition);
        doc.text(jsonData.position || 'Начальник Отдела эксплуатации информационных технологий', 30, yPosition + 15);
        doc.text(jsonData.shortname || '', doc.page.width - 130, yPosition + 15);

        yPosition += 100;
        doc.text('Принял(а):', 30, yPosition);
        doc.text('Начальник Отдела эксплуатации', 30, yPosition + 15);
        doc.text('информационных технологий', 30, yPosition + 30);
        doc.text('Сайдалиходжаев Р.Б.', doc.page.width - 150, yPosition + 22.5);

        logger.info("[generateTransferPdf] Завершение документа...");
        doc.end();

        writeStream.on('finish', () => {
            logger.info("[generateTransferPdf] PDF успешно создан: " + outputFilePath);
            resolve(outputFilePath);
        });

        writeStream.on('error', (error) => {
            logger.error("[generateTransferPdf] Ошибка при создании PDF: " + error.message);
            reject(error);
        });
    });
};


module.exports = { generatePdf, generatePdfUrl , generateTransferPdf};
