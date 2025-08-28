const { Texnika, TexHistory , sequelize , UserHistory, Transfered } = require("../models");
const {
  EquipmentHistory,
  Equipment,
  User,
  Employee,
  SupportEmployee,
  Position,
} = require("../models");
const {Op} = require('sequelize') 
const xlsx = require("xlsx");
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require("fs");
const logger = require("../utils/logger");
const multer = require('multer');

// Faylni diskda saqlash uchun storage sozlamalari
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Faylni 'public/files' papkasida saqlaymiz
    cb(null, path.join(__dirname, '../public/files/')); // public/files papkaga
  },
  filename: function (req, file, cb) {
    // Fayl nomini 'output.pdf' qilib belgilaymiz
    cb(null, 'output.pdf'); // Fayl nomini o'zgartirmaymiz, faqat 'output.pdf' nomi bilan saqlaymiz
  }
});

const upload = multer({ storage: storage });

// Jadval nomlarini mos keluvchi modellarga bog‘lash
const tableModels = {
  users: User,
  texnika: Texnika,
  tex_history: TexHistory,
  user_history: UserHistory,
};

const processExcel = async (fileBuffer, req, username) => {
  const errorList = [];

  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    const requiredColumns = [
      "equipment_name",
      "inventory_number",
      "serial_number",
      "mac",
      "status",
    ];

    const filteredData = jsonData.map((row) => {
      const filteredRow = {};
      requiredColumns.forEach((col) => {
        filteredRow[col] = row[col] || null;
      });
      return filteredRow;
    });

    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      const rowErrors = [];
      const emptyFields = [];

      requiredColumns.forEach((col) => {
        if (!row[col]) emptyFields.push(col);
      });

      if (emptyFields.length > 0) {
        rowErrors.push(
          `Строка ${i + 2} (inventory_number: ${
            row.inventory_number || "не указан"
          }): Пустые поля - ${emptyFields.join(", ")}`
        );
      }

      const existingTexnika = await Texnika.findOne({
        where: {
          [Op.or]: [
            { inventory_number: row.inventory_number },
            { serial_number: row.serial_number },
            { mac: row.mac },
          ],
        },
      });

      if (existingTexnika) {
        rowErrors.push(
          `Строка ${i + 2} (inventory_number: ${
            row.inventory_number
          }): Этот inventory_number уже существует в базе данных!`
        );
      }

      if (rowErrors.length > 0) {
        errorList.push(...rowErrors);
        continue;
      }

      try {
        // Запись в базу данных
        await Texnika.create({
          equipment_name: row.equipment_name,
          inventory_number: row.inventory_number,
          serial_number: row.serial_number,
          mac: row.mac,
          status: row.status,
          department: "ИТ Суппорт",
          username: username,
          section: "acception",
        });

        await TexHistory.create({
          inventory_number: row.inventory_number,
          employee_full_name: "Не указано",
          employee_department: "ИТ Суппорт",
          document_file_path: null,
          username: username,
          equipment_name: row.equipment_name,
          status: row.status,
          description: "Оборудование добавлено через Excel импорт",
        });
      } catch (dbError) {
        logger.error("Ошибка при сохранении строки в базу", {
          row: i + 2,
          inventory_number: row.inventory_number,
          error: dbError.message,
        });

        errorList.push(
          `Строка ${i + 2} (inventory_number: ${
            row.inventory_number
          }): Ошибка записи в базу данных - ${dbError.message}`
        );
      }
    }

    return errorList;
  } catch (err) {
    logger.error("Ошибка при обработке Excel файла", { error: err.message });
    throw new Error("Ошибка при обработке Excel файла");
  }
};


// Excel файл yaratish funksiyasi
async function generateExcelUserhistoryFile(table, filters = {}) {
  try {
    const model = tableModels[table];
    if (!model) {
      throw new Error("Неверное имя таблицы");
    }

    let whereClause = {};

    if (filters.start && filters.end) {
      whereClause.data = {
        [Op.between]: [new Date(filters.start), new Date(filters.end)],
      };
    }
    let parsedUserId = filters.user_id;
    if (
      typeof filters.user_id === "string" &&
      filters.user_id.startsWith("{")
    ) {
      try {
        parsedUserId = JSON.parse(filters.user_id);
      } catch (e) {
        parsedUserId = null;
      }
    }
    whereClause.user_id = parsedUserId;

    if (filters.search) {
      whereClause.name = { [Op.iLike]: `%${filters.search}%` };
    }

    if (filters.inventory_number) {
      whereClause.inventory_number = filters.inventory_number;
    }

    if (filters.filter) {
      whereClause.status = filters.filter;
    }

    const records = await model.findAll({
      where: whereClause,
      raw: true,
      order: [["id", "ASC"]],
      attributes: table === "users" ? { exclude: ["password"] } : undefined,
    });

    if (records.length === 0) {
      throw new Error("Таблица пуста или данные для данного фильтра отсутствуют");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(table);

    // № raqamli ustunni boshiga qo‘shamiz
    const modifiedRecords = records.map((record, idx) => ({
      no: idx + 1,
      ...record,
    }));

    // Ustunlar tayyorlash
    const columns = Object.keys(modifiedRecords[0]).map((key) => ({
      header: key === "no" ? "№" : key,
      key,
      width: 20, // boshlang'ich kenglik, keyin yana optimallashtiriladi
    }));
    worksheet.columns = columns;

    // Header (sarlavha) formatlash
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: false, // ❌ wrapText o‘chirilgan
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFCC00" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Ma'lumotlar qo‘shish
    modifiedRecords.forEach((record) => {
      const row = worksheet.addRow(record);
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: false, // ❌ wrapText o‘chirilgan
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Avtomatik kenglik sozlash
    worksheet.columns.forEach((column) => {
      let maxLength = column.header.toString().length;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const valLength = cell.value ? cell.value.toString().length : 10;
        if (valLength > maxLength) maxLength = valLength;
      });
      column.width = Math.min(maxLength + 5, 50); // maksimal 50
    });

    // Faylni saqlash
    const filePath = path.join(__dirname, `../temp/${table}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  } catch (error) {
    throw error;
  }
}

class FileService {

  static async handleDownload(filePath, res) {
    try {
      if (!filePath) {
        logger.error("Путь к файлу не указан");
        return res.status(400).json({ message: "Укажите путь к файлу." });
      }

      const decodedPath = decodeURIComponent(filePath);
      const absolutePath = path.join(decodedPath);

      fs.access(absolutePath, fs.constants.F_OK, (err) => {
        if (err) {
          logger.error("Файл не найден", { path: absolutePath, error: err.message });
          return res.status(404).json({ message: "Файл не найден" });
        }

        const fileName = path.basename(absolutePath);
        logger.info(`Файл найден: ${fileName}, начинаем загрузку...`);

        res.download(absolutePath, fileName, (err) => {
          if (err) {
            logger.error("Ошибка загрузки файла", { file: fileName, error: err.message });
            res.status(500).json({ message: "Ошибка загрузки файла" });
          } else {
            logger.info(`Файл успешно загружен: ${fileName} , ggesdasads`);
          }
        });
      });
    } catch (error) {
      logger.error("Непредвиденная ошибка сервера при скачивании", { error: error.message });
      res.status(500).json({ message: "Ошибка сервера" });
    }
  }

  static handleUpload(req, res) {
    upload.single('file')(req, res, (error) => {
      if (error) {
        logger.error("Ошибка загрузки файла", { error: error.message });
        return res.status(500).json({ success: false, message: "Не удалось сохранить файл" });
      }

      // Успешная загрузка
      logger.info("Файл успешно загружен", { fileName: 'output.pdf' });
      res.status(200).json({ success: true, fileName: 'output.pdf' });
    });
  }

  static async handleExportToExcel(table, { start, end }, res) {
    try {
      // Генерация Excel файла
      const filePath = await generateExcelFile(table, { start, end });
      logger.info(`Excel файл успешно сгенерирован для таблицы: ${table}`, { filePath });

      // Скачать файл через res.download
      res.download(filePath, `${table}.xlsx`, (err) => {
        if (err) {
          logger.error("Ошибка загрузки файла", { error: err.message });
          return res.status(500).json({ error: "Ошибка при скачивании файла" });
        }

        // Подождать 5 секунд и удалить файл
        setTimeout(() => {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error("Ошибка при удалении файла", { filePath, error: err.message });
            } else {
              logger.info("Файл удален", { filePath });
            }
          });
        }, 5000);
      });

    } catch (error) {
      logger.error("Ошибка при экспорте", { error: error.message });
      return res.status(500).json({ error: "Ошибка при экспорте Excel файла" });
    }
  }

  static async handleExportFilteredToExcelUserhistory({ user_id, filename, records }, res) {
    try {
      if (!records) {
        logger.warn("❗ 'records' (target_user_id) kiritilmagan");
        return res.status(400).json({ error: "Ma'lumotlar topilmadi: records bo'sh" });
      }

      const recordsData = await UserHistory.findAll({
        where: { user_id: records },
        raw: true
      });

      if (!recordsData.length) {
        logger.warn(`📭 Tarix topilmadi: user_id=${records}`);
        return res.status(404).json({ error: "Berilgan user_id bo'yicha tarix topilmadi" });
      }

      logger.info(`📤 Excel eksporti: so'rovchi user_id=${user_id}, maqsad user_id=${records}, jami=${recordsData.length}`);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("User History");

      const firstRow = recordsData[0];
      const columns = Object.keys(firstRow).map((key) => ({
        header: key.replace(/_/g, " ").toUpperCase(),
        key: key,
        width: 25,
      }));
      worksheet.columns = columns;

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF34495E" }
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      recordsData.forEach((record) => {
        const safeRecord = {};
        for (const key in firstRow) {
          safeRecord[key] = record[key] ?? "";
        }
        worksheet.addRow(safeRecord);
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const fileName = filename || `user_history_${Date.now()}.xlsx`;
      const filePath = path.join(tempDir, fileName);

      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error("❌ Yuklab olishda xatolik", { error: err.message });
          return res.status(500).json({ error: "Faylni yuklashda xatolik" });
        }

        logger.info(`✅ Fayl yuborildi: ${fileName} (foydalanuvchi_id=${records})`);

        setTimeout(() => {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error("🗑️ Fayl o'chirishda xatolik", { error: err.message });
            } else {
              logger.info("🧹 Vaqtinchalik fayl o'chirildi", { filePath });
            }
          });
        }, 5000);
      });

    } catch (error) {
      logger.error("❌ Excel eksportida umumiy xatolik", { error: error.message });
      res.status(500).json({ error: "Excel eksportida xatolik yuz berdi" });
    }
  }

  static async exportHistoryToExcelFromRecords({ user_id, records, filename }, res) {
    try {
      if (!user_id || !Array.isArray(records) || records.length === 0) {
        logger.warn("❗ Не указан user_id или отсутствуют записи для экспорта");
        return res.status(400).json({ error: "user_id и records обязательны" });
      }

      logger.info(`📤 Экспорт в Excel: пользователь_id=${user_id}, количество записей=${records.length}`);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("История");

      const firstRow = records[0];
      const columns = Object.keys(firstRow).map((key) => ({
        header: key.replace(/_/g, " ").toUpperCase(),
        key: key,
        width: 25
      }));

      worksheet.columns = columns;

      // Header style
  // Header style
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }; // Katta oq shrift
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF34495E" }
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });


      // Ma'lumotlar qatori
      records.forEach((record) => {
        const safeRecord = {};
        for (const key of Object.keys(firstRow)) {
          safeRecord[key] = record[key] !== null && record[key] !== undefined ? record[key] : "";
        }
        worksheet.addRow(safeRecord);
      });

      // Barcha hujayralarga style berish (data qatorlari uchun)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // header skip
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        });
      });

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const fileName = filename || `history_${Date.now()}.xlsx`;
      const filePath = path.join(tempDir, fileName);

      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error("❌ Ошибка при загрузке файла", { error: err.message });
          return res.status(500).json({ error: "Ошибка при загрузке файла" });
        }

        logger.info(`✅ Excel-файл успешно отправлен пользователю [${user_id}]: ${fileName}`);

        setTimeout(() => {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error("❌ Ошибка при удалении временного файла", { filePath, error: err.message });
            } else {
              logger.info("🗑️ Временный файл удалён", { filePath });
            }
          });
        }, 5000);
      });

    } catch (error) {
      logger.error("❌ Общая ошибка при экспорте в Excel", { error: error.message });
      res.status(500).json({ error: "Произошла ошибка при экспорте Excel" });
    }
  }

}


module.exports = { processExcel , generateExcelUserhistoryFile  , FileService};
