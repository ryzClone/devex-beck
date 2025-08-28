const { Position } = require("../models");
const logger = require("../utils/logger");

// service
const getAllPositionsService = async ({ page, size }) => {
  const limit = parseInt(size);
  const offset = (parseInt(page) - 1) * limit;

  const { count, rows } = await Position.findAndCountAll({
    limit,
    offset,
    order: [["created_at", "DESC"]], // default tartib
  });

  return {
    data: rows,
    total: count,
    page: parseInt(page),
    size: limit,
    totalPages: Math.ceil(count / limit),
  };
};

// --- Создание должности ---
const createPositionService = async (name) => {
  try {
    const existing = await Position.findOne({ where: { name } });

    if (existing) {
      const msg = `В базе уже существует должность '${name}'`;
      logger.warn(`[PositionService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    const newPosition = await Position.create({ name });

    logger.info(`[PositionService] ✅ Создано: ${JSON.stringify(newPosition)}`);
    return { success: true, position: newPosition };
  } catch (error) {
    logger.error(`[PositionService] ❌ Ошибка: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// --- Service ---
const updatePositionService = async (id, name) => {
  try {
    const position = await Position.findByPk(id);
    if (!position) {
      const msg = "Должность не найдена";
      logger.warn(`[PositionService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    position.name = name;
    await position.save();

    logger.info(`[PositionService] ✅ Обновлена: ${JSON.stringify(position)}`);
    return {
      success: true,
      message: "Должность успешно обновлена!",
      position,
    };
  } catch (error) {
    logger.error(`[PositionService] ❌ Ошибка: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// O‘chirish
const deletePositionService = async (id) => {
  try {
    logger.info(`[PositionService] deletePositionService chaqirildi. id=${id}`);

    const position = await Position.findByPk(id);
    if (!position) {
      const msg = "Позиция не найдена";
      logger.warn(`[PositionService] ⚠️ ${msg}`);
      return { success: false, message: msg };
    }

    await position.destroy();

    const msg = `Позиция с ID=${id} успешно удалена`;
    logger.info(`[PositionService] ✅ ${msg}`);

    return { success: true, message: msg };
  } catch (error) {
    logger.error(`[PositionService] ❌ Ошибка: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};


module.exports = {
  getAllPositionsService,
  createPositionService,
  updatePositionService,
  deletePositionService,
};
