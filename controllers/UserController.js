// controllers/userController.js
const userService = require('../services/userService');
const logger = require("../utils/logger"); // yo'lingni moslashtir

const readUsers = async (req, res) => {
  try {
    const users = await userService.readUsers(req.query);
    res.status(200).json({
      message: 'Пользователи успешно извлечены',
      data: users.data,
      total: users.total,
    });
  } catch (err) {
    logger.error("[readUsers controller] Xatolik", {
      message: err.message,
      stack: err.stack,
    });
    res.status(err.status || 500).json({
      message: err.message || "Ошибка сервера при извлечении пользователей",
    });
  }
};

const addUser = async (req, res) => {
  try {
    const user = await userService.addUser(req.body);
    res.status(201).json({
      message: 'Пользователь успешно создан',
      data: user,
    });
  } catch (err) {
    logger.error("[addUser controller] Xatolik", {
      message: err.message,
      stack: err.stack,
    });

    res.status(err.status || 500).json({
      message: err.message || "Ошибка сервера при создании пользователя",
    });
  }
};

const editStatusUser = async (req, res) => {
  try {
    const user = await userService.editStatusUser(req.body);
    res.status(200).json(user);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Непредвиденная ошибка",
    });
  }
};

const userDelete = async (req, res) => {
  try {
    logger.info("📩 [userController.userDelete] Kirish", {
      body: req.body
    });

    const result = await userService.userDelete(req.body);

    logger.info("✅ [userController.userDelete] Foydalanuvchi o‘chirildi", {
      user_id: result.updatedUser.id
    });

    res.status(200).json({ message: result.message, data: result.updatedUser });

  } catch (err) {
    logger.error("💥 [userController.userDelete] Xatolik", {
      message: err.message,
      payload: req.body
    });

    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

const userUpdate = async (req, res) => {
  try {
    logger.info("📩 [userController.userUpdate] Kirish", {
      body: req.body
    });

    const user = await userService.userUpdate(req.body);

    logger.info("✅ [userController.userUpdate] Foydalanuvchi muvaffaqiyatli yangilandi", {
      id: user.id
    });

    res.status(200).json({ message: 'Пользователь обновлен успешно', data: user });
  } catch (err) {
    logger.error("💥 [userController.userUpdate] Xatolik", {
      message: err.message,
      payload: req.body
    });

    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

const userEditPassword = async (req, res) => {
  try {
    const user = await userService.userEditPassword(req.body);
    res.status(200).json({ message: 'Пароль успешно обновлен', data: user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { addUser, readUsers, editStatusUser, userDelete, userUpdate, userEditPassword };