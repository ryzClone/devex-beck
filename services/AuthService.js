const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, UserHistory } = require("../models");
const logger = require("../utils/logger.js");
const { Op } = require("sequelize");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.SECRET_KEY,
    { expiresIn: "1h" }
  );
};

class AuthService {
  static async login(username, password) {
    try {
      logger.info("Попытка входа в систему", { username });

      if (!username || !password) {
        logger.error("Отсутствуют логин или пароль", { username });
        return {
          status: 400,
          message: "Логин и пароль обязательны",
        };
      }

      const user = await User.findOne({
        where: {
          username: {
            [Op.iLike]: username.trim(),
          },
        },
      });

      if (!user) {
        logger.error("Пользователь не найден", { username });
        return {
          status: 404,
          message: "Пользователь не найден",
        };
      }

      if (user.status !== "active") {
        logger.error("Учетная запись не активна", { username });
        return {
          status: 403,
          message: "Учетная запись не активна, доступ запрещен.",
        };
      }

      const storedPassword = user.password;
      let isMatch = false;

      if (
        storedPassword.startsWith("$2a$") ||
        storedPassword.startsWith("$2b$")
      ) {
        isMatch = await bcrypt.compare(password, storedPassword);
      } else {
        isMatch = password === storedPassword;
      }

      if (!isMatch) {
        logger.error("Неправильный пароль", { username });
        return {
          status: 401,
          message: "Неправильный пароль",
        };
      }

      const token = generateToken(user);

      logger.info("Успешный вход", { username });

      
      await UserHistory.create({
        user_id: user.id,
        action: "login", 
        entity_type: "user",
        entity_id: user.id,
        description: "Вход в систему",
        created_at: new Date(),
      });

      return {
        status: 200,
        data: {
          token,
          username: user.username,
          user_id: user.id,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("🔥 [ERROR] Kirishda xatolik:", error.message);
      logger.error("Ошибка при входе", { username, error: error.message });
      return {
        status: 500,
        message: "Внутренняя ошибка сервера",
      };
    }
  }
}

module.exports = AuthService;
