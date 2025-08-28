const { Equipment, EquipmentHistory , sequelize } = require("../models").Equipment
  ? require("../models")
  : require("../models/equipment");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { UserHistory } = require("../models");

const getEquipment = async ({ page, size, search, filter, status }) => {
  const offset = (page > 0 ? page - 1 : 0) * size;
  const where = {};

  const statusMap = {
    texnika: "В рабочем состоянии",
    repair: "В ремонте",
    unused: "В нерабочем состоянии",
  };

  if (status && status !== "all" && statusMap[status]) {
    where.status = statusMap[status];
    logger.info(`[getEquipment] Статус отфильтрован: ${statusMap[status]}`);
  }

  const allowedFilters = [
    "name",
    "inventory_number",
    "serial_number",
    "mac_address",
  ];
  if (search && filter && allowedFilters.includes(filter)) {
    where[filter] = { [Op.iLike]: `%${search}%` };
    logger.info(`[getEquipment] Поиск по фильтру: ${filter}, значение: ${search}`);
  } else if (search) {
    logger.warn(`[getEquipment] Неверный фильтр: ${filter}`);
  }

  try {
    const { rows: data, count: total } = await Equipment.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit: size,
      offset,
    });

    logger.info(`[getEquipment] Получено данных: ${data.length}, всего: ${total}`);
    return { data, total };
  } catch (error) {
    logger.error(`[getEquipment] Ошибка при получении данных: ${error.message}`);
    throw error;
  }
};

const addEquipment = async ({
  name,
  inventory_number,
  serial_number,
  mac_address,
  users_id,
}) => {
  const t = await Equipment.sequelize.transaction();

  try {
    // Tekshirish
    const existing = await Equipment.findOne({
      where: {
        [Op.or]: [
          { inventory_number },
          { serial_number },
          { mac_address },
        ],
      },
      transaction: t,
    });

    if (existing) {
      logger.error("Ошибка: техника с такими данными уже существует");
      throw new Error("Техника с такими данными уже существует");
    }

    // Yangi texnika qo'shish
    const newEquipment = await Equipment.create(
      {
        name,
        inventory_number,
        serial_number,
        mac_address,
        status: "В рабочем состоянии",
      },
      { transaction: t }
    );

    await UserHistory.create(
      {
        user_id: users_id,           
        action: "create",           
        entity_type: "equipment",    
        entity_id: newEquipment.id,   
        description: "В систему добавлена техника",     
      },
      { transaction: t }
    );



    await t.commit();

    logger.info(`Техника успешно добавлена: инв. № ${inventory_number}, MAC: ${mac_address}`);
    return newEquipment;
  } catch (error) {
    await t.rollback();
    logger.error(`Ошибка при добавлении техники: ${error.message}`);
    throw error;
  }
};

const updateEquipment = async ({
  id,
  name,
  inventory_number,
  serial_number,
  mac_address,
  users_id,     
}) => {
  const t = await sequelize.transaction();

  try {
    const equipment = await Equipment.findByPk(id, { transaction: t });
    if (!equipment) {
      throw new Error("Оборудование с указанным ID не найдено");
    }

    const oldData = { ...equipment.get() };

    await equipment.update(
      {
        name,
        inventory_number,
        serial_number,
        mac_address,
      },
      { transaction: t }
    );

    const changes = [];
    if (oldData.name !== name) {
      changes.push(`Название изменено с "${oldData.name}" на "${name}"`);
    }
    if (oldData.inventory_number !== inventory_number) {
      changes.push(
        `Инв. номер изменён с "${oldData.inventory_number}" на "${inventory_number}"`
      );
    }
    if (oldData.serial_number !== serial_number) {
      changes.push(
        `Серийный номер изменён с "${oldData.serial_number}" на "${serial_number}"`
      );
    }
    if (oldData.mac_address !== mac_address) {
      changes.push(
        `MAC-адрес изменён с "${oldData.mac_address}" на "${mac_address}"`
      );
    }

    const changeDescription = changes.length
      ? changes.join(", ")
      : description || "Изменений не внесено";

        await UserHistory.create(
      {
        user_id: users_id,           
        action: "update",           
        entity_type: "equipment",    
        entity_id: id,   
        description: changeDescription,     
      },
      { transaction: t }
    );

    await t.commit();
    logger.info(
      `Оборудование обновлено: ${name} | ${changeDescription}`
    );
    return equipment;
  } catch (error) {
    await t.rollback();
    logger.error(`Ошибка при обновлении оборудования: ${error.message}`);
    throw error;
  }
};

function getReadableStatus(status) {
  switch (status) {
    case "В рабочем состоянии":
      return "рабочего состояния";
    case "В ремонте":
      return "ремонтного состояния";
    case "В нерабочем состоянии":
      return "нерабочего состояния";
    default:
      return status.toLowerCase();
  }
}

const moveToEquipment = async ({ equipment_id, users_id }) => {
  const t = await Equipment.sequelize.transaction();

  try {
    const equipment = await Equipment.findByPk(equipment_id, { transaction: t });

    if (!equipment) throw new Error("Техника не найдена по ID");

    if (
      equipment.status !== "В ремонте" &&
      equipment.status !== "В нерабочем состоянии"
    ) {
      throw new Error("Данная техника не может быть переведена в рабочее состояние");
    }

    const prevStatus = equipment.status;
    equipment.status = "В рабочем состоянии";
    await equipment.save({ transaction: t });

    await UserHistory.create({
      user_id: users_id,
      action: "update",
      entity_type: "equipment",
      entity_id: equipment_id,
      description: `Техника была переведена из ${getReadableStatus(prevStatus)} в рабочее состояние`,
    }, { transaction: t });

    await t.commit();
    logger.info(`Техника переведена в рабочее состояние: ${equipment_id}`);
  } catch (err) {
    await t.rollback();
    logger.error(`Ошибка при переводе техники в рабочее состояние: ${err.message}`);
    throw err;
  }
};


const moveToRepair = async ({ equipment_id, users_id }) => {
  const t = await Equipment.sequelize.transaction();

  try {
    const equipment = await Equipment.findByPk(equipment_id, { transaction: t });

    if (!equipment) throw new Error("Техника не найдена по ID");

    if (
      equipment.status === "В нерабочем состоянии" ||
      equipment.status === "В рабочем состоянии"
    ) {
      const prevStatus = equipment.status;
      equipment.status = "В ремонте";
      await equipment.save({ transaction: t });

      await UserHistory.create({
        user_id: users_id,
        action: "update",
        entity_type: "equipment",
        entity_id: equipment_id,
        description: `Техника была переведена из ${getReadableStatus(prevStatus)} в ремонтное состояние`,
      }, { transaction: t });

      await t.commit();
      logger.info(`Техника переведена в ремонт: ${equipment_id}`);
    } else {
      throw new Error("Неверный статус для перевода в ремонт");
    }
  } catch (err) {
    await t.rollback();
    logger.error(`Ошибка при переводе в ремонт: ${err.message}`);
    throw err;
  }
};


const moveToUnused = async ({ equipment_id, users_id }) => {
  const t = await Equipment.sequelize.transaction();

  try {
    const equipment = await Equipment.findByPk(equipment_id, { transaction: t });

    if (!equipment) throw new Error("Техника не найдена по ID");

    if (
      equipment.status === "В рабочем состоянии" ||
      equipment.status === "В ремонте"
    ) {
      const prevStatus = equipment.status;
      equipment.status = "В нерабочем состоянии";
      await equipment.save({ transaction: t });

      await UserHistory.create({
        user_id: users_id,
        action: "update",
        entity_type: "equipment",
        entity_id: equipment_id,
        description: `Техника была переведена из ${getReadableStatus(prevStatus)} в нерабочее состояние`,
      }, { transaction: t });

      await t.commit();
      logger.info(`Техника переведена в нерабочее состояние: ${equipment_id}`);
    } else {
      throw new Error("Неверный статус для перевода в нерабочее состояние");
    }
  } catch (error) {
    await t.rollback();
    logger.error(`Ошибка при переводе в нерабочее состояние: ${error.message}`);
    throw error;
  }
};




module.exports = {
  getEquipment,
  addEquipment,
  updateEquipment,
  moveToEquipment,
  moveToRepair,
  moveToUnused,
};
