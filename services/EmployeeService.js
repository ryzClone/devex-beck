const { Employee, Position } = require("../models");
const logger = require("../utils/logger");

// --- Service: Get All ---
const getAllEmployeesService = async ({ page, size }) => {
  const limit = parseInt(size);
  const offset = (parseInt(page) - 1) * limit;

  const { count, rows } = await Employee.findAndCountAll({
    limit,
    offset,
    order: [["created_at", "DESC"]],
    include: [
      { model: Position, as: "position" } // bog‘langan lavozimni ham olish
    ],
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
const createEmployeeService = async ({
  fullname,
  shortname,
  subdivision,
  department,
  position_id,
  passport_serial_number,
  passport_given_date,
  passport_given_by,
}) => {
  try {
    // FIO bo‘yicha mavjudligini tekshirish
    const existing = await Employee.findOne({ where: { fullname } });
    if (existing) {
      const msg = `В базе уже существует сотрудник с ФИО '${fullname}'`;
      logger.warn(`[EmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    const newEmployee = await Employee.create({
      fullname,
      shortname,
      subdivision,
      department,
      position_id,
      passport_serial_number,
      passport_given_date,
      passport_given_by,
    });

    logger.info(
      `[EmployeeService] ✅ Создан: ${JSON.stringify(newEmployee)}`
    );

    return { success: true, data: newEmployee };
  } catch (error) {
    logger.error(`[EmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

// --- Service: Update ---
const updateEmployeeService = async (
  id,
  {
    fullname,
    shortname,
    subdivision,
    department,
    position_id,
    passport_serial_number,
    passport_given_date,
    passport_given_by,
  }
) => {
  try {
    const employee = await Employee.findByPk(id);
    if (!employee) {
      const msg = "Сотрудник не найден";
      logger.warn(`[EmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    // yangilash
    employee.fullname = fullname ?? employee.fullname;
    employee.shortname = shortname ?? employee.shortname;
    employee.subdivision = subdivision ?? employee.subdivision;
    employee.department = department ?? employee.department;
    employee.position_id = position_id ?? employee.position_id;
    employee.passport_serial_number =
      passport_serial_number ?? employee.passport_serial_number;
    employee.passport_given_date =
      passport_given_date ?? employee.passport_given_date;
    employee.passport_given_by =
      passport_given_by ?? employee.passport_given_by;

    await employee.save();

    logger.info(
      `[EmployeeService] ✅ Обновлен: ${JSON.stringify(employee)}`
    );

    return {
      success: true,
      message: "Сотрудник успешно обновлен!",
      employee,
    };
  } catch (error) {
    logger.error(`[EmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

// --- Service: Delete ---
const deleteEmployeeService = async (id) => {
  try {
    logger.info(`[EmployeeService] deleteEmployeeService вызван. id=${id}`);

    const employee = await Employee.findByPk(id);
    if (!employee) {
      const msg = "Сотрудник не найден";
      logger.warn(`[EmployeeService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    await employee.destroy();

    const msg = `Сотрудник с ID=${id} успешно удален`;
    logger.info(`[EmployeeService] ✅ ${msg}`);

    return { success: true, message: msg };
  } catch (error) {
    logger.error(`[EmployeeService] ❌ Ошибка: ${error.message}`, {
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

module.exports = {
  getAllEmployeesService,
  createEmployeeService,
  updateEmployeeService,
  deleteEmployeeService,
};
