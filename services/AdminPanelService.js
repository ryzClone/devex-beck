const { Employee, SupportEmployee, Position , OperatingSystem , InstalledSoftware} = require("../models");
const { Op } = require("sequelize");
const { format, subDays } = require("date-fns");
const logger = require("../utils/logger");  // logger fayling qaerda bo‘lsa o‘sha path
const ExcelJS = require("exceljs");
const db = require("../models");

const getDashboardStats = async (interval = "weekly") => {
  logger.info(`Функция getDashboardStats вызвана с параметром interval: ${interval}`);

  const intervalMap = {
    daily: 1,
    weekly: 7,
    monthly: 30,
  };
  const days = intervalMap[interval] || 7;

  const today = new Date();
  const startDate = subDays(today, days - 1);

  try {
    logger.info("Начинается подсчёт общего количества сотрудников, поддерживающих сотрудников, должностей, ОС и ПО");

    // Count
    const [employeeCount, supportCount, positionCount, osCount, softwareCount] = await Promise.all([
      Employee.count(),
      SupportEmployee.count(),
      Position.count(),
      OperatingSystem.count(),
      InstalledSoftware.count(),
    ]);

    logger.info(
      `Подсчёт завершён: сотрудники=${employeeCount}, поддержка=${supportCount}, должности=${positionCount}, ОС=${osCount}, ПО=${softwareCount}`
    );

    // Recent records for chart
    logger.info("Получение данных для графиков роста (employees, support, positions, os, software)");

    const [recentEmployees, recentSupport, recentPositions, recentOS, recentSoftware] = await Promise.all([
      Employee.findAll({
        attributes: ["created_at"],
        where: { created_at: { [Op.gte]: startDate } },
        raw: true,
      }),
      SupportEmployee.findAll({
        attributes: ["created_at"],
        where: { created_at: { [Op.gte]: startDate } },
        raw: true,
      }),
      Position.findAll({
        attributes: ["created_at"],
        where: { created_at: { [Op.gte]: startDate } },
        raw: true,
      }),
      OperatingSystem.findAll({
        attributes: ["created_at"],
        where: { created_at: { [Op.gte]: startDate } },
        raw: true,
      }),
      InstalledSoftware.findAll({
        attributes: ["created_at"],
        where: { created_at: { [Op.gte]: startDate } },
        raw: true,
      }),
    ]);

    logger.info(
      `Данные для графиков получены: employees=${recentEmployees.length}, support=${recentSupport.length}, positions=${recentPositions.length}, ОС=${recentOS.length}, ПО=${recentSoftware.length}`
    );

    const buildDateMap = () => {
      const map = {};
      for (let i = 0; i < days; i++) {
        const date = format(subDays(today, i), "yyyy-MM-dd");
        map[date] = 0;
      }
      return map;
    };

    const buildChart = (records) => {
      const dateMap = buildDateMap();
      records.forEach((rec) => {
        const date = format(new Date(rec.created_at), "yyyy-MM-dd");
        if (dateMap[date] !== undefined) {
          dateMap[date]++;
        }
      });
      return Object.keys(dateMap)
        .sort()
        .map((date) => ({
          label: format(new Date(date), "dd-MM"),
          count: dateMap[date],
        }));
    };

    const employeeGrowthChart = buildChart(recentEmployees);
    const supportGrowthChart = buildChart(recentSupport);
    const positionGrowthChart = buildChart(recentPositions);
    const osGrowthChart = buildChart(recentOS);
    const softwareGrowthChart = buildChart(recentSoftware);

    logger.info("Графики роста успешно построены");

    // Table data (последние 30 записей)
    logger.info("Получение последних 30 записей для таблиц (employees, support, positions, os, software)");

    const [employeeTable, supportTable, positionTable, osTable, softwareTable] = await Promise.all([
      Employee.findAll({ limit: 30, order: [["created_at", "DESC"]] }),
      SupportEmployee.findAll({ limit: 30, order: [["created_at", "DESC"]] }),
      Position.findAll({ limit: 30, order: [["created_at", "DESC"]] }),
      OperatingSystem.findAll({ limit: 30, order: [["created_at", "DESC"]] }),
      InstalledSoftware.findAll({ limit: 30, order: [["created_at", "DESC"]] }),
    ]);

    logger.info(
      `Табличные данные получены: employees=${employeeTable.length}, support=${supportTable.length}, positions=${positionTable.length}, ОС=${osTable.length}, ПО=${softwareTable.length}`
    );

    return {
      totalEmployees: employeeCount,
      totalSupportEmployees: supportCount,
      totalPositions: positionCount,
      totalOperatingSystems: osCount,
      totalInstalledSoftware: softwareCount,

      employeeGrowthChart,
      supportGrowthChart,
      positionGrowthChart,
      osGrowthChart,
      softwareGrowthChart,

      employeeTable,
      supportTable,
      positionTable,
      osTable,
      softwareTable,
    };
  } catch (error) {
    logger.error(`Ошибка в getDashboardStats: ${error.message}`);
    throw error;
  }
};

const adminpanelExportToExcelService = async (from, to, tableName) => {
  let whereClause = {};

  if (from && to) {
  const fromDate = new Date(from);
  const toDate = new Date(to);

    // Tugash sanasini kunning oxiriga qo‘yamiz
    toDate.setHours(23, 59, 59, 999);

    whereClause.created_at = { [Op.between]: [fromDate, toDate] };

    logger.info(`Установлен фильтр: с ${from} по ${to}`);
  }

  if (!tableName || !db[tableName]) {
    logger.error(`Некорректное название таблицы: ${tableName}`);
    logger.info(`Доступные таблицы: ${Object.keys(db).join(", ")}`);
    throw new Error("Некорректное название таблицы");
  }

  logger.info(`Начало выборки данных из таблицы: ${tableName}`);

  const records = await db[tableName].findAll({ where: whereClause, raw: true });

  logger.info(`Количество полученных записей: ${records.length}`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Данные");

  if (records.length > 0) {
    // Ustunlarni yaratish
    worksheet.columns = Object.keys(records[0]).map((key) => ({
      header: key,
      key: key,
      width: 20,
    }));

    // 🔥 Header dizayni
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "A52A2A" }, // anor rang
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" } }; // oq, bold
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };
    });

    // 🔥 Malumotlarni qo‘shish
    records.forEach((record) => {
      const row = worksheet.addRow(record);
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      });
    });

    logger.info("Данные успешно добавлены в Excel-worksheet с форматированием");
  } else {
    logger.warn("База данных вернула пустой результат. Лист Excel будет пустым");
  }

  const buffer = await workbook.xlsx.writeBuffer();
  logger.info(`Excel-файл сформирован. Размер буфера: ${buffer.length} байт`);

  return buffer;
};

module.exports = {
  getDashboardStats,
  adminpanelExportToExcelService
};
