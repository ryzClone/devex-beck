const { SupportEmployee } = require("../models");
const logger = require("../utils/logger");

// --- Service: Get All ---
const getAllSupportEmployeesService = async ({ page, size }) => {
  const limit = parseInt(size);
  const offset = (parseInt(page) - 1) * limit;

  const { count, rows } = await SupportEmployee.findAndCountAll({
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });

  return {
    data: rows,
    total: count,
    page: parseInt(page),
    size: limit,
    totalPages: Math.ceil(count / limit),
  };
};

// --- Service: Create ---
const createSupportEmployeeService = async (fullname) => {
  try {
    const existing = await SupportEmployee.findOne({ where: { fullname } });

    if (existing) {
      const msg = `В базе уже существует сотрудник поддержки '${fullname}'`;
      logger.warn(`[SupportEmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    const newSupportEmployee = await SupportEmployee.create({ fullname });

    logger.info(
      `[SupportEmployeeService] ✅ Создано: ${JSON.stringify(newSupportEmployee)}`
    );
    return { success: true, supportEmployee: newSupportEmployee };
  } catch (error) {
    logger.error(`[SupportEmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

// --- Service: Update ---
const updateSupportEmployeeService = async (id, fullname) => {
  try {
    const supportEmployee = await SupportEmployee.findByPk(id);
    if (!supportEmployee) {
      const msg = "Сотрудник поддержки не найден";
      logger.warn(`[SupportEmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    supportEmployee.fullname = fullname;
    await supportEmployee.save();

    logger.info(
      `[SupportEmployeeService] ✅ Обновлен: ${JSON.stringify(supportEmployee)}`
    );
    return {
      success: true,
      message: "Сотрудник поддержки успешно обновлен!",
      supportEmployee,
    };
  } catch (error) {
    logger.error(`[SupportEmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

// --- Service: Delete ---
const deleteSupportEmployeeService = async (id) => {
  try {
    logger.info(
      `[SupportEmployeeService] deleteSupportEmployeeService вызван. id=${id}`
    );

    const supportEmployee = await SupportEmployee.findByPk(id);
    if (!supportEmployee) {
      const msg = "Сотрудник поддержки не найден";
      logger.warn(`[SupportEmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    await supportEmployee.destroy();

    const msg = `Сотрудник поддержки с ID=${id} успешно удален`;
    logger.info(`[SupportEmployeeService] ✅ ${msg}`);

    return { success: true, message: msg };
  } catch (error) {
    logger.error(`[SupportEmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

module.exports = {
  getAllSupportEmployeesService,
  createSupportEmployeeService,
  updateSupportEmployeeService,
  deleteSupportEmployeeService,
};
