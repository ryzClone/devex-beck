const { InstalledSoftware, OperatingSystem, sequelize } = require("../models");
const logger = require("../utils/logger");

// --- GET ALL: barcha softwarelarni olish (OS bilan) ---
const getAllInstalledSoftwareService = async ({ page, size }) => {
  try {
    const limit = parseInt(size) || 10;
    const offset = ((parseInt(page) || 1) - 1) * limit;

    logger.info(`[InstalledSoftwareService] 🔍 Получение всех ПО. page=${page}, size=${size}`);

    const { count, rows } = await InstalledSoftware.findAndCountAll({
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: OperatingSystem,
          as: "operating_systems",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    logger.info(`[InstalledSoftwareService] ✅ Получено ПО. count=${count}, page=${page}, size=${size}`);

    return {
      success: true,
      data: rows,
      total: count,
      page: parseInt(page) || 1,
      size: limit,
      totalPages: Math.ceil(count / limit),
    };
  } catch (error) {
    logger.error(`[InstalledSoftwareService] ❌ Ошибка при получении ПО: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// --- GET ONE: bitta software ---
const getByIdInstalledSoftwareService = async (id) => {
  try {
    logger.info(`[InstalledSoftwareService] 🔍 Получение ПО с ID=${id}`);

    const software = await InstalledSoftware.findByPk(id, {
      include: [
        {
          model: OperatingSystem,
          as: "operating_systems",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!software) {
      const msg = "Программное обеспечение не найдено";
      logger.warn(`[InstalledSoftwareService] ⚠️ ${msg} ID=${id}`);
      return { success: false, message: msg };
    }

    logger.info(`[InstalledSoftwareService] ✅ Найдено ПО с ID=${id}`);
    return { success: true, data: software };
  } catch (error) {
    logger.error(`[InstalledSoftwareService] ❌ Ошибка при получении ПО ID=${id}: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// --- CREATE: yangi software qo‘shish (OS bilan) ---
const createInstalledSoftwareService = async ({ name, operating_system_ids = [] }) => {
  const t = await sequelize.transaction();
  try {
    logger.info(`[InstalledSoftwareService] ✏️ Создание нового ПО: ${name}`);

    // OS lar borligini tekshirish
    if (!Array.isArray(operating_system_ids) || !operating_system_ids.length) {
      const msg = "Нельзя создать ПО без связанной ОС";
      logger.warn(`[InstalledSoftwareService] ⚠️ ${msg}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    const validOS = await OperatingSystem.findAll({
      where: { id: operating_system_ids },
      transaction: t,
    });

    if (!validOS.length) {
      const msg = `Не найдены ОС для связывания с ПО: ${JSON.stringify(operating_system_ids)}`;
      logger.warn(`[InstalledSoftwareService] ⚠️ ${msg}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    const newSoftware = await InstalledSoftware.create({ name }, { transaction: t });
    await newSoftware.setOperating_systems(validOS, { transaction: t });

    logger.info(`[InstalledSoftwareService] ✅ ПО создано с ID=${newSoftware.id} и связями с ОС: ${validOS.map(os => os.id)}`);

    await t.commit();
    return { success: true, data: await getByIdInstalledSoftwareService(newSoftware.id) };
  } catch (error) {
    await t.rollback();
    logger.error(`[InstalledSoftwareService] ❌ Ошибка при создании ПО: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// --- UPDATE: software yangilash (OS bilan) ---
const updateInstalledSoftwareService = async (id, { name, operating_system_ids }) => {
  const t = await sequelize.transaction();
  try {
    logger.info(`[InstalledSoftwareService] ✏️ Обновление ПО ID=${id}`);

    const software = await InstalledSoftware.findByPk(id, { transaction: t });
    if (!software) {
      const msg = "Программное обеспечение не найдено";
      logger.warn(`[InstalledSoftwareService] ⚠️ ${msg} ID=${id}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    if (name) software.name = name;
    await software.save({ transaction: t });

    if (Array.isArray(operating_system_ids)) {
      if (!operating_system_ids.length) {
        const msg = "Нельзя обновить ПО без связанных ОС";
        logger.warn(`[InstalledSoftwareService] ⚠️ ${msg}`);
        await t.rollback();
        return { success: false, message: msg };
      }

      const validOS = await OperatingSystem.findAll({
        where: { id: operating_system_ids },
        transaction: t,
      });

      if (!validOS.length) {
        const msg = `Не найдены ОС для связывания с ПО: ${JSON.stringify(operating_system_ids)}`;
        logger.warn(`[InstalledSoftwareService] ⚠️ ${msg}`);
        await t.rollback();
        return { success: false, message: msg };
      }

      await software.setOperating_systems(validOS, { transaction: t });
      logger.info(`[InstalledSoftwareService] 🔗 Обновление связей с OS для ПО ID=${id}: ${validOS.map(os => os.id)}`);
    }

    await t.commit();
    return { success: true, data: await getByIdInstalledSoftwareService(software.id) };
  } catch (error) {
    await t.rollback();
    logger.error(`[InstalledSoftwareService] ❌ Ошибка при обновлении ПО ID=${id}: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

// --- DELETE: software o‘chirish ---
const deleteInstalledSoftwareService = async (id) => {
  const t = await sequelize.transaction();
  try {
    const software = await InstalledSoftware.findByPk(id, { transaction: t });
    if (!software) {
      const msg = "Программное обеспечение не найдено";
      logger.warn(`[InstalledSoftwareService] ⚠️ ${msg} ID=${id}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    await software.setOperating_systems([], { transaction: t });
    await software.destroy({ transaction: t });

    await t.commit();
    logger.info(`[InstalledSoftwareService] ✅ ПО ID=${id} успешно удалено`);
    return { success: true, message: `ПО с ID=${id} успешно удалено` };
  } catch (error) {
    await t.rollback();
    logger.error(`[InstalledSoftwareService] ❌ Ошибка при удалении ПО ID=${id}: ${error.message}`, { stack: error.stack });
    return { success: false, message: error.message };
  }
};

module.exports = {
  getAllInstalledSoftwareService,
  getByIdInstalledSoftwareService,
  createInstalledSoftwareService,
  updateInstalledSoftwareService,
  deleteInstalledSoftwareService,
};
