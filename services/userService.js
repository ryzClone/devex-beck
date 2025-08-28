const bcrypt = require("bcrypt");
const { User, sequelize, UserHistory } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger"); // yo'lingni moslashtir


const readUsers = async ({ page = 1, size = 10, search = "", status = "", state }) => {
  const offset = (page - 1) * size;
  const where = {};
  const searchValue = search.trim();

  logger.info(`[readUsers] So‘rov boshlandi`, {
    params: { page, size, search, status, state },
  });

if (searchValue) {
  where[Op.or] = [
    { username: { [Op.iLike]: `%${searchValue}%` } },
    { role: { [Op.iLike]: `%${searchValue}%` } },
    { status: { [Op.iLike]: `%${searchValue}%` } },
  ];

  // Agar user `search` da `true`, `false`, yoki "faol"/"nofaol" deb qidirsa:
  if (searchValue.toLowerCase() === "active") {
    where[Op.or].push({ state: true });
  } else if (searchValue.toLowerCase() === "inactive") {
    where[Op.or].push({ state: false });
  }
}


  if (status?.trim()) where.status = status;
  where.state = state !== undefined ? state : true;

  try {
    const { rows, count } = await User.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      order: [["id", "ASC"]],
      limit: parseInt(size),
      offset: parseInt(offset),
    });

    logger.info(`[readUsers] Ma'lumotlar olindi`, {
      total: count,
      returned: rows.length,
    });

    return { data: rows, total: count };
  } catch (error) {
    logger.error(`[readUsers] Xatolik`, {
      message: error.message,
      stack: error.stack,
    });

    throw {
      status: 500,
      message: "Ошибка при извлечении пользователей из базы данных",
    };
  }
};

const addUser = async ({ username, password, role, status, users_id }) => {
  const transaction = await sequelize.transaction();
  logger.info(`[addUser] Foydalanuvchi yaratish boshlandi`, { username });

  try {
    if (username === password) {
      const msg = "Имя пользователя и пароль не могут быть одинаковыми";
      logger.warn(`[addUser] Xatolik: ${msg}`);
      throw { status: 400, message: msg };
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      const msg = "Пользователь с таким именем уже существует";
      logger.warn(`[addUser] Xatolik: ${msg}`);
      throw { status: 400, message: msg };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create(
      {
        username,
        password: hashedPassword,
        role,
        status,
      },
      { transaction }
    );

    await UserHistory.create(
      {
        user_id: users_id,
        action: "create",
        entity_type: "user",
        entity_id: newUser.id,
        description: "Пользователь был добавлен в систему",
      },
      { transaction }
    );

    await transaction.commit();

    logger.info(`[addUser] Foydalanuvchi yaratildi`, {
      id: newUser.id,
      username: newUser.username,
    });

    return newUser;
  } catch (error) {
    await transaction.rollback();

    logger.error(`[addUser] Xatolik`, {
      message: error.message,
      stack: error.stack,
    });

    throw {
      status: error.status || 500,
      message: error.message || "Ошибка при создании пользователя",
    };
  }
};

const editStatusUser = async ({ id, status, users_id }) => {
  const transaction = await sequelize.transaction();
  logger.info(`[editStatusUser] Status yangilash boshlandi`, { id, status });

  try {
    const user = await User.findByPk(id, { transaction });

    if (!user) {
      const msg = "Пользователь не найден";
      logger.warn(`[editStatusUser] Foydalanuvchi topilmadi`, { id });
      throw { status: 404, message: msg };
    }

    await user.update({ status }, { transaction });

    await UserHistory.create({
      user_id: users_id,
      action: "update",
      entity_type: "user",
      entity_id: id,
      description: `Статус изменен на ${status}`,
    }, { transaction });

    await transaction.commit();
    logger.info(`[editStatusUser] Status yangilandi`, { id, newStatus: status });
    return user;
  } catch (error) {
    await transaction.rollback();
    logger.error(`[editStatusUser] Xatolik`, {
      message: error.message || error,
      stack: error.stack,
    });

    // ✳️ Frontga qaytariladigan xatolik
    throw {
      status: error.status || 500,
      message: error.message || "Внутренняя ошибка сервера",
    };
  }
};

const userDelete = async ({ id, user_id }) => {
  logger.info("➡️ [userDelete] Kirish", {
    payload: { id, user_id }
  });

  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      const message = `❌ [userDelete] Пользователь с id=${id} не найден`;
      logger.warn(message);
      throw new Error("Пользователь не найден");
    }

    logger.info("✅ [userDelete] Foydalanuvchi topildi", { user: user.toJSON() });

    user.status = "не активен";
    user.state = false;

    await user.save({ transaction });

    logger.info("🛠 [userDelete] Status yangilandi", {
      id: user.id,
      status: user.status
    });

    const historyEntry = await UserHistory.create(
      {
        user_id: user_id,
        action: "delete",
        entity_type: "user",
        entity_id: id,
        description: `Пользователь удален: ${id}`,
      },
      { transaction }
    );

    logger.info("📝 [userDelete] Tarixga yozildi", {
      history_id: historyEntry?.id,
      user_id,
    });

    await transaction.commit();

    return {
      message: "Пользователь успешно деактивирован",
      updatedUser: user
    };

  } catch (error) {
    await transaction.rollback();
    logger.error("💥 [userDelete] Xatolik yuz berdi", {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const userUpdate = async ({ id, users_id, password, role, status, username }) => {
  const transaction = await sequelize.transaction();  

  try {
    logger.info("➡️ [userUpdate] Kirish", {
      payload: { id, users_id, password: Boolean(password), role, status, username }
    });

    // ID tekshiruvlari
    if (!id || isNaN(Number(id))) {
      throw new Error(`❌ [userUpdate] Noto'g'ri id: "${id}" — bu raqam bo'lishi kerak`);
    }

    if (!users_id || isNaN(Number(users_id))) {
      throw new Error(`❌ [userUpdate] Noto'g'ri users_id: "${users_id}" — bu raqam bo'lishi kerak`);
    }

    const user = await User.findByPk(id, { transaction });
    if (!user) {
      throw new Error("❌ [userUpdate] Пользователь не найден");
    }

    logger.info("✅ [userUpdate] Foydalanuvchi topildi", {
      user: user.toJSON()
    });

    if (user.status === "inactive") {
      throw new Error("❌ [userUpdate] Обновление запрещено: пользователь неактивен");
    }

    const updates = {};
    const historyChanges = [];

    if (username && username !== user.username) {
      updates.username = username;
      historyChanges.push(`Имя: "${user.username}" → "${username}"`);
    }

    if (role && role !== user.role) {
      updates.role = role;
      historyChanges.push(`Роль: "${user.role}" → "${role}"`);
    }

    if (status && status !== user.status) {
      updates.status = status;
      historyChanges.push(`Статус: "${user.status}" → "${status}"`);
    }

    if (password) {
      const isSame = await bcrypt.compare(password, user.password);
      if (!isSame) {
        updates.password = await bcrypt.hash(password, 10);
        historyChanges.push("Пароль был изменен");
      } else {
        historyChanges.push("Пароль введён тот же — не изменён");
      }
    }

    if (Object.keys(updates).length > 0) {
      logger.info("🛠 [userUpdate] Yangilanayotgan qiymatlar", { updates });

      await user.update(updates, { transaction });

      const historyEntry = await UserHistory.create(
        {
          user_id: Number(users_id),
          action: "update",
          entity_type: "user",
          entity_id: Number(user.id),
          description: historyChanges.join(" | "),
        },
        { transaction }
      );

      if (!historyEntry) {
        throw new Error("❌ [userUpdate] Ошибка при записи в UserHistory");
      }

      logger.info("📝 [userUpdate] UserHistory yozildi", {
        changes: historyChanges
      });

    } else {
      logger.info("ℹ️ [userUpdate] Yangilashga hech nima topilmadi.");
    }

    await transaction.commit();
    logger.info("✅ [userUpdate] Transaction muvaffaqiyatli yakunlandi");
    return user;

  } catch (error) {
    await transaction.rollback();
    logger.error("💥 [userUpdate] Xatolik yuz berdi", {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const userEditPassword = async ({ system_users, oldPassword, newPassword }) => {
  const user = await User.findOne({ where: { system_users } });
  if (!user) {

    throw new Error("Пользователь не найден");
  }
  let isPasswordMatch = false;
  if (oldPassword === user.password) {
    isPasswordMatch = true;
  } else {
    isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  }
  if (!isPasswordMatch) {
    throw new Error("Неверный старый пароль");
  }
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedNewPassword });
  return { message: "Пароль изменен", login: "out" };
};


module.exports = { addUser, readUsers, editStatusUser, userDelete, userUpdate, userEditPassword };
