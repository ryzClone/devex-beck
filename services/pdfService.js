const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

const generatePdf = (jsonData) => {
    return new Promise((resolve, reject) => {
        logger.info("[generatePdf] Генерация PDF началась...");

        const outputFilePath = path.join(__dirname, '../public/files', 'output.pdf');
        const fontPath = path.join(__dirname, '../fonts', 'TimesNewRomanPS-BoldMT.ttf');
        const regularFontPath = path.join(__dirname, '../fonts', 'timesnewromanpsmt.ttf');

        logger.info("[generatePdf] Проверка наличия старого PDF-файла...");
        if (fs.existsSync(outputFilePath)) {
            logger.error("[generatePdf] Обнаружен старый PDF-файл. Удаление...");
            fs.unlinkSync(outputFilePath);
        }

        logger.info("[generatePdf] Создание нового PDF-документа...");
        const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 30, right: 30 }, size: 'A4' });
        const writeStream = fs.createWriteStream(outputFilePath);
        doc.pipe(writeStream);

        logger.info("[generatePdf] Форматирование даты...");
        const formatDate = () => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const monthNumber = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const monthsInRussian = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
            return `«${day}» ${monthsInRussian[parseInt(monthNumber, 10) - 1]} ${year} г.`;
        };

        logger.info("[generatePdf] Добавление даты в документ...");
        doc.font(regularFontPath).fontSize(12);
        doc.font(fontPath).fontSize(12).text(formatDate(), { align: 'right' });

        doc.moveDown(5);
        logger.info("[generatePdf] Добавление заголовка...");
        doc.font(fontPath).text('АКТ ПРИЕМА-ПЕРЕДАЧИ', { align: 'center' });
        doc.moveDown(1);

        logger.info("[generatePdf] Добавление основного текста...");
        doc.font(regularFontPath).text(
            `Настоящий акт составлен о том, что Банк передаёт в распоряжение подразделения ${jsonData.division} следующее оборудование: ${jsonData.department}. ` +
            `${jsonData.full_name} (паспорт: ${jsonData.passport_serial_number}, выдан: ${jsonData.passport_issue_date}, ${jsonData.issued_by}) ` +
            `получает указанное ниже оборудование.`,
            { align: 'left', indent: 40 }
        );

        doc.moveDown(1);
        doc.font(regularFontPath).text('Прием-передачу техники осуществил начальник Отдела эксплуатации информационных технологий Сайдалиходжаев Р.Б.:', { align: 'left', indent: 40 });
        doc.moveDown(2);

        logger.info("[generatePdf] Создание заголовков таблицы...");
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

        logger.info("[generatePdf] Заполнение таблицы данными...");
        doc.font(regularFontPath);
        tableData.forEach((row) => {
            row.forEach((cell, index) => {
                const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
                doc.text(cell, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });
                doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
            });
            yPosition += rowHeight;
        });

        logger.info("[generatePdf] Добавление подписей...");
        yPosition += 100;
        doc.font(fontPath).text('Передал:', 30, yPosition);
        doc.text('Начальник Отдела эксплуатации', 30, yPosition + 15);
        doc.text('информационных технологий', 30, yPosition + 30);
        doc.text('Сайдалиходжаев Р.Б.', doc.page.width - 150, yPosition + 22.5);

        yPosition += 100;
        doc.text('Принял(а):', 30, yPosition);
        doc.text(jsonData.position || 'Начальник Отдела эксплуатации информационных технологий', 30, yPosition + 15);
        doc.text(jsonData.new_employee_fio || '', doc.page.width - 130, yPosition + 15);

        logger.info("[generatePdf] Завершение формирования документа...");
        doc.end();

        writeStream.on('finish', () => {
            logger.info(`[generatePdf] PDF успешно создан: ${outputFilePath}`);
            resolve('PDF успешно создан');
        });

        writeStream.on('error', (error) => {
            logger.error(`[generatePdf] Ошибка при создании PDF: ${error}`);
            reject(error);
        });
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
