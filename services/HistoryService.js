const { Op } = require('sequelize');
const { EquipmentHistory, UserHistory, Employee , Equipment , SupportEmployee , User , Position} = require('../models');
const logger = require('../utils/logger');

const Historyview = async ({
  page = 1,
  size = 10,
  search = "",
  filter = "",
  equipment_id = "",
  user_id = "",
}) => {
  const offset = (page - 1) * size;
  const where = {};

  if (equipment_id) where.equipment_id = equipment_id;
  if (user_id) where.users_id = user_id;

  if (filter && search) {
    where[filter] = { [Op.iLike]: `%${search}%` };
  } else if (search) {
    where.description = { [Op.iLike]: `%${search}%` };
  }

  try {
    const { rows, count } = await EquipmentHistory.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: size,
      offset,
      include: [
        {
          model: Equipment,
          as: "equipment",
          attributes: ["name", "inventory_number", "serial_number", "mac_address" , "status"],
        },
        {
          model: User,
          as: "user",
          attributes: ["username"],
        },
        {
          model: Employee,
          as: "employee",
          attributes: ["shortname", "position_id"],
          include: [
            {
              model: Position,
              as: "position",
              attributes: ["name"],
            },
          ],
        },
        {
          model: SupportEmployee,
          as: "support_employee",
          attributes: ["fullname"],
        },
      ],
    });

    return { data: rows, total: count };
  } catch (error) {
    console.error("Ошибка Historyview:", error);
    return { error: error.message };
  }
};

const UserHistoryView = async ({ page = 1, size = 10, search = "", user = null, user_id = null }) => {

  const limit = parseInt(size, 10);
  const offset = (page - 1) * limit;
  const where = {};

  logger.info(`[UserHistoryView] Request started`, {
    viewerId: user_id,
    targetUserId: user || null,
    page,
    size,
    search,
  });

  if (!user) {
    logger.warn(`[UserHistoryView] Target user ID is missing`, {
      viewerId: user_id,
    });
    return { error: "Target user not specified." };
  }

  where.user_id = parseInt(user, 10);

  if (search?.trim()) {
    const searchValue = search.trim();
    where[Op.or] = [
      { action: { [Op.iLike]: `%${searchValue}%` } },
      { description: { [Op.iLike]: `%${searchValue}%` } },
    ];
  }

  logger.info(`[UserHistoryView] Final WHERE filter:`, where);

  try {
    const { rows, count } = await UserHistory.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user_histories",
          attributes: ["id", "username"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
      logging: false,
    });

    logger.info(`[UserHistoryView] Data successfully retrieved`, {
      viewerId: user_id,
      targetUserId: user,
      totalRecords: count,
      returnedRecords: rows.length,
    });

    return {
      data: rows.map((row) => ({
        ...row.toJSON(),
      })),
      total: count,
    };
  } catch (error) {
    logger.error(`[UserHistoryView] Error occurred while retrieving history`, {
      viewerId: user_id,
      targetUserId: user,
      error: error.message,
      stack: error.stack,
      where,
    });

    return { error: "An error occurred while retrieving user history." };
  }
};

const EquipmentHistoryView = async ({
  page = 1,
  size = 10,
  search = "",
  user_id = null,
  intity_id = null,
}) => {
  const limit = parseInt(size, 10);
  const offset = (page - 1) * limit;

  if (!user_id || !intity_id) {
    logger.warn(`[EquipmentHistoryView] user_id yoki intity_id ko‘rsatilmagan`, {
      user_id,
      intity_id,
    });
    return { error: "user_id yoki intity_id ko‘rsatilmagan" };
  }

  // Username topib olish
  const requester = await User.findByPk(user_id, {
    attributes: ["username"],
  });

  const requesterUsername = requester?.username || "Noma'lum";

  logger.info(`[EquipmentHistoryView] Foydalanuvchi texnika tarixini so‘ramoqda`, {
    requestedBy: requesterUsername,
    equipmentEntityId: intity_id,
    query: { page, size, search, intity_id, user_id },
  });

  // WHERE filtri
  const where = {
    entity_id: intity_id,
    entity_type: "equipment",
  };

  if (search?.trim()) {
    const searchValue = search.trim();
    where[Op.or] = [
      { action: { [Op.iLike]: `%${searchValue}%` } },
      { description: { [Op.iLike]: `%${searchValue}%` } },
    ];
  }

  const { rows, count } = await UserHistory.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user_histories",
        attributes: ["id", "username"],
      },
      {
        model: Equipment,
        as: "equipment_entity",
        attributes: ["id", "name", "inventory_number", "serial_number", "status"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    logging: false,
  });

  logger.info(`[EquipmentHistoryView] Ma'lumot muvaffaqiyatli olindi`, {
    requestedBy: requesterUsername,
    equipmentEntityId: intity_id,
    totalRecords: count,
    returnedRecords: rows.length,
  });

  return {
    data: rows.map((row) => row.toJSON()),
    total: count,
  };
};





module.exports = { Historyview, UserHistoryView ,EquipmentHistoryView};
