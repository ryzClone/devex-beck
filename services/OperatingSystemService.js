const { OperatingSystem, InstalledSoftware, sequelize } = require("../models");
const logger = require("../utils/logger");

// --- GET: hamma OSlarni olish (pagination + software bilan) ---
const getAllOperatingSystemsService = async ({ page, size }) => {
  try {
    const limit = parseInt(size) || 10;
    const offset = ((parseInt(page) || 1) - 1) * limit;

    const { count, rows } = await OperatingSystem.findAndCountAll({
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [{ model: InstalledSoftware, as: "softwares" }],
    });

    logger.info(
      `[OperatingSystemService] ✅ Получены ОС. count=${count}, page=${page}, size=${size}`
    );

    return {
      success: true,
      data: rows,
      total: count,
      page: parseInt(page) || 1,
      size: limit,
      totalPages: Math.ceil(count / limit),
    };
  } catch (error) {
    logger.error(
      `[OperatingSystemService] ❌ Ошибка при получении ОС: ${error.message}`,
      { stack: error.stack }
    );
    return { success: false, message: error.message };
  }
};

// --- POST: OS yaratish ---
const createOperatingSystemService = async ({ name, softwares }) => {
  const t = await sequelize.transaction();
  try {
    logger.info(`[OperatingSystemService] 🟢 Создание ОС: name='${name}', softwares=${JSON.stringify(softwares)}`);

    const existing = await OperatingSystem.findOne({ where: { name }, transaction: t });
    if (existing) {
      const msg = `В базе уже существует операционная система '${name}'`;
      logger.warn(`[OperatingSystemService] ⚠️ ${msg}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    const newOS = await OperatingSystem.create({ name }, { transaction: t });
    logger.info(`[OperatingSystemService] 🟢 ОС создана: ${JSON.stringify(newOS)}`);

    if (Array.isArray(softwares) && softwares.length > 0) {
      const validSoftwares = await InstalledSoftware.findAll({
        where: { id: softwares },
        transaction: t,
      });
      if (validSoftwares.length !== softwares.length) {
        logger.warn(`[OperatingSystemService] ⚠️ Не все softwares найдены. Requested: ${softwares}, Found: ${validSoftwares.map(s => s.id)}`);
      }
      await newOS.addSoftwares(validSoftwares, { transaction: t });
      logger.info(`[OperatingSystemService] 🟢 Добавлены softwares к ОС: ${validSoftwares.map(s => s.id)}`);
    }

    await t.commit();
    logger.info(`[OperatingSystemService] ✅ Транзакция commit успешна. ОС создана с ID=${newOS.id}`);
    return { success: true, data: newOS };
  } catch (error) {
    await t.rollback();
    logger.error(
      `[OperatingSystemService] ❌ Ошибка при создании ОС: ${error.message}`,
      { stack: error.stack }
    );
    return { success: false, message: error.message };
  }
};

// --- PUT: OS yangilash ---
const updateOperatingSystemService = async (id, { name, softwares }) => {
  const t = await sequelize.transaction();
  try {
    logger.info(`[OperatingSystemService] 🟢 Обновление ОС ID=${id}, name='${name}', softwares=${JSON.stringify(softwares)}`);

    const os = await OperatingSystem.findByPk(id, { transaction: t });
    if (!os) {
      const msg = `ОС с ID=${id} не найдена`;
      logger.warn(`[OperatingSystemService] ⚠️ ${msg}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    if (name) {
      await os.update({ name }, { transaction: t });
      logger.info(`[OperatingSystemService] 🟢 Обновлено name ОС ID=${id} => ${name}`);
    }

    if (Array.isArray(softwares)) {
      const validSoftwares = await InstalledSoftware.findAll({
        where: { id: softwares },
        transaction: t,
      });
      await os.setSoftwares(validSoftwares, { transaction: t });
      logger.info(`[OperatingSystemService] 🟢 Обновлены softwares для ОС ID=${id} => ${validSoftwares.map(s => s.id)}`);
    }

    await t.commit();
    logger.info(`[OperatingSystemService] ✅ Транзакция commit успешна. ОС ID=${id} обновлена`);
    return { success: true, message: "ОС успешно обновлена", data: os };
  } catch (error) {
    await t.rollback();
    logger.error(
      `[OperatingSystemService] ❌ Ошибка при обновлении ОС (ID=${id}): ${error.message}`,
      { stack: error.stack }
    );
    return { success: false, message: error.message };
  }
};

// --- DELETE: OS o‘chirish ---
const deleteOperatingSystemService = async (id) => {
  const t = await sequelize.transaction();
  try {
    logger.info(`[OperatingSystemService] 🟢 Удаление ОС ID=${id}`);
    const os = await OperatingSystem.findByPk(id, {
      include: [{ model: InstalledSoftware, as: "softwares" }],
      transaction: t,
    });

    if (!os) {
      const msg = `ОС с ID=${id} не найдена`;
      logger.warn(`[OperatingSystemService] ⚠️ ${msg}`);
      await t.rollback();
      return { success: false, message: msg };
    }

    await os.setSoftwares([], { transaction: t });
    await os.destroy({ transaction: t });

    await t.commit();
    const msg = `ОС с ID=${id} успешно удалена`;
    logger.info(`[OperatingSystemService] ✅ ${msg}`);
    return { success: true, message: msg };
  } catch (error) {
    await t.rollback();
    logger.error(
      `[OperatingSystemService] ❌ Ошибка при удалении ОС (ID=${id}): ${error.message}`,
      { stack: error.stack }
    );
    return { success: false, message: error.message };
  }
};

module.exports = {
  getAllOperatingSystemsService,
  createOperatingSystemService,
  updateOperatingSystemService,
  deleteOperatingSystemService,
};
