const bcrypt = require("bcrypt");
const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const multer = require('multer');

const PDFDocument = require('pdfkit');


const { generateToken } = require("../config/jwt");

// Users functions
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users_table WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (user) {

      if (user.status === "не активен") {
        return res
          .status(403)
          .json({ message: "Учетная запись отключена, доступ запрещен." });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        const token = generateToken(user);
        res.json({
          data: {
            token,
            username: user.username,
            role: user.role,
          },
        });
      } else {
        res.status(401).json({ message: "Неправильный пароль" });
      }
    } else {
      res.status(401).json({ message: "Пользователь не найден !!!" });
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const addUser = async (req, res) => {
  const { username, password, role, status } = req.body;

  // Username va parol bir xil bo'lishi mumkin emasligini tekshirish
  if (username === password) {
    return res
      .status(400)
      .json({ message: "Имя пользователя и пароль не могут быть одинаковыми" });
  }

  try {
    // Foydalanuvchi mavjudligini tekshirish
    const existingUser = await pool.query(
      "SELECT * FROM users_table WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Пользователь с таким именем пользователя уже существует" });
    }

    // Parolni xashlash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yangi foydalanuvchini qo'shish
    const result = await pool.query(
      "INSERT INTO users_table (username, password, role, status, date) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id",
      [username, hashedPassword, role, status]
    );

    const userId = result.rows[0].id;

    res.status(201).json({
      message: "Пользователь успешно создан",
      data: {
        id: userId,
        username,
        role,
        status,
        date: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const readUsers = async (req, res) => {
  const {
    page = 1,
    size = 10,
    search = "",
    status = "",
    role = "",
  } = req.query;

  try {
    // Calculate offset
    const offset = (page - 1) * size;
    const queryParams = [];
    let query = `
      SELECT id, username, role, password, date, status 
      FROM users_table 
      WHERE 1=1
    `;

    // `search` bo'yicha filtr
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND username ILIKE $${queryParams.length}`;
    }

    // `status` bo'yicha filtr
    if (status) {
      queryParams.push(status);
      query += ` AND status = $${queryParams.length}`;
    }

    // `role` bo'yicha filtr
    if (role) {
      queryParams.push(role);
      query += ` AND role = $${queryParams.length}`;
    }

    // Agar barcha filtrlar bo'sh bo'lsa, sanasi bo'yicha tartiblash
    if (!search && !status && !role) {
      query += ` ORDER BY date DESC`;
    } else {
      // Tartiblash: `status` bo'yicha
      query += ` ORDER BY
        CASE WHEN status = 'active' THEN 1
             WHEN status = 'disabled' THEN 2
             ELSE 3
        END,
        date DESC`;
    }

    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(query, queryParams);

    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) FROM users_table WHERE 1=1
    `;

    // `search` bo'yicha filtr
    if (search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND username ILIKE $${totalQueryParams.length}`;
    }

    // `status` bo'yicha filtr
    if (status) {
      totalQueryParams.push(status);
      totalQuery += ` AND status = $${totalQueryParams.length}`;
    }

    // `role` bo'yicha filtr
    if (role) {
      totalQueryParams.push(role);
      totalQuery += ` AND role = $${totalQueryParams.length}`;
    }

    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = totalResult.rows[0].count;

    res.status(200).json({
      message: "Пользователи успешно извлечены",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const editStatusUser = async (req, res) => {
  const { id, status } = req.body;

  try {
    // Ma'lumotlar bazasida `status` ni yangilash uchun SQL so'rovi
    const query = `
      UPDATE users_table
      SET status = $1
      WHERE id = $2
      RETURNING id, username, role, date, status
    `;

    // So'rovni bajarish va yangilangan foydalanuvchi ma'lumotlarini olish
    const result = await pool.query(query, [status, id]);

    // Agar foydalanuvchi topilmasa yoki yangilanmasa
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Пользователь не найден или не обновлен" });
    }

    // Muvaffaqiyatli yangilanishni qaytarish
    res.status(200).json({
      message: "Статус пользователя успешно обновлен",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const userDelete = async (req, res) => {
  const { id } = req.body;

  try {
    // Ma'lumotlar bazasidan foydalanuvchini o'chirish uchun SQL so'rovi
    const query = `
      DELETE FROM users_table
      WHERE id = $1
      RETURNING id
    `;

    // So'rovni bajarish va o'chirilgan foydalanuvchi ID ni olish
    const result = await pool.query(query, [id]);

    // Agar foydalanuvchi topilmasa yoki o'chirilmasa
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Пользователь не найден или не удален" });
    }

    // Muvaffaqiyatli o'chirishni qaytarish
    res.status(200).json({
      message: "Пользователь успешно удален",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const userUpdate = async (req, res) => {
  const { id, username, password, role, status } = req.body;

  if (!id || !username || !role || !status) {
    return res.status(400).json({ message: "Отсутствуют обязательные поля" });
  }

  try {
    let hashedPassword;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // SQL so'rovini tuzish
    let query = `
      UPDATE users_table
      SET username = $1,
          ${password ? 'password = $2,' : ''}
          role = $3,
          status = $4
      WHERE id = $5
      RETURNING id, username, role, status
    `;

    const queryParams = [username, role, status, id];

    if (password) {
      queryParams.splice(1, 0, hashedPassword); // Parolni qo'shamiz
    }

    const result = await pool.query(query, queryParams);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Пользователь не найден или не обновлен" });
    }

    res.status(200).json({
      message: "Пользователь обновлен успешно",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const userEditPassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "Недостаточно данных" });
  }

  try {
    // Получаем пользователя из базы данных
    const userResult = await pool.query("SELECT * FROM users_table WHERE username = $1", [username]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const user = userResult.rows[0];
    // Проверяем старый пароль
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Неверный старый пароль" });
    }

    // Хешируем новый пароль
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Обновляем новый пароль
    const updateResult = await pool.query(
      "UPDATE users_table SET password = $1 WHERE username = $2 RETURNING id, username",
      [hashedNewPassword, username]
    );

    res.status(200).json({
      message: "Пароль успешно обновлен",
      data: updateResult.rows[0],
    });
  } catch (err) {
    console.error("Ошибка на сервере:", err); // Логируем ошибки
    res.status(500).json({ message: "Ошибка на сервере", error: err.message });
  }
};

// Texnika functions

const readTexnika = async (req, res) => {
  const { page = 1, size = 10, search = "", filter = "", status = "" } = req.query;

  try {
    const offset = (page > 0 ? page - 1 : 0) * size;

    const queryParams = [];
    let query = `
      SELECT id, naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address, status,
        TO_CHAR(data, 'DD-MM-YYYY HH24:MI:SS') AS data_formatted
      FROM texnika  
      WHERE 1=1
    `;

    // Status filtri (texnika, repair, unused yoki all)
    if (status && status !== "all") {
      if (status === "texnika") {
        queryParams.push("В рабочем состоянии");
        query += ` AND status = $${queryParams.length}`;
      } else if (status === "repair") {
        queryParams.push("В ремонте");
        query += ` AND status = $${queryParams.length}`;
      } else if (status === "unused") {
        queryParams.push("В нерабочем состоянии");
        query += ` AND status = $${queryParams.length}`;
      }
    }

    // Search filtri
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (${filter}::TEXT ILIKE $${queryParams.length})`;
    }

    query += ` ORDER BY data DESC`;

    // LIMIT va OFFSET
    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(query, queryParams);

    // Umumiy sonni hisoblash
    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) AS total FROM texnika WHERE 1=1
    `;

    // Status filtri umumiy hisoblashda
    if (status && status !== "all") {
      if (status === "texnika") {
        totalQueryParams.push("В рабочем состоянии");
        totalQuery += ` AND status = $${totalQueryParams.length}`;
      } else if (status === "repair") {
        totalQueryParams.push("В ремонте");
        totalQuery += ` AND status = $${totalQueryParams.length}`;
      } else if (status === "unused") {
        totalQueryParams.push("В нерабочем состоянии");
        totalQuery += ` AND status = $${totalQueryParams.length}`;
      }
    }

    // Search filtri umumiy hisoblashda
    if (search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND (${filter}::TEXT ILIKE $${totalQueryParams.length})`;
    }

    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = totalResult.rows[0]?.total || 0;

    res.status(200).json({
      message: "Данные успешно получены.",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTexnika = async (req, res) => {
  const { id, naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address } = req.body;
  const username = "ИТ Суппорт"; // Yangilayotgan foydalanuvchi nomi

  if (!id) {
    return res.status(400).json({ message: "ID is required" });
  }

  const client = await pool.connect();

  try {
    // Transaction boshlaymiz
    await client.query("BEGIN");

    // Texnika jadvalidan eski ma'lumotlarni olish
    const oldQuery = `
      SELECT * FROM texnika WHERE id = $1;
    `;
    const oldResult = await client.query(oldQuery, [id]);

    if (oldResult.rowCount === 0) {
      await client.query("ROLLBACK"); // Transactionni bekor qilamiz
      return res
        .status(404)
        .json({ message: "Техника с указанным идентификатором не найдена" });
    }

    const oldTexnika = oldResult.rows[0];

    // Texnika jadvalini yangilash
    const updateQuery = `
      UPDATE texnika
      SET naimenovaniya_tex = $1,
          inv_tex = $2,
          seriyniy_nomer = $3,
          mac_address = $4
      WHERE id = $5
      RETURNING *;
    `;
    const updateValues = [
      naimenovaniya_tex,
      inv_tex,
      seriyniy_nomer,
      mac_address,
      id,
    ];
    const updateResult = await client.query(updateQuery, updateValues);

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK"); // Transactionni bekor qilamiz
      return res
        .status(404)
        .json({ message: "Техника с указанным идентификатором не найдена" });
    }

    const updatedTexnika = updateResult.rows[0];

    // Yangi va eski ma'lumotlarni solishtirib, o'zgargan qismlar haqida tavsif yozish
    let description = "Данные были обновлены. Изменения: ";
    const changes = [];

    if (oldTexnika.naimenovaniya_tex !== updatedTexnika.naimenovaniya_tex) {
      changes.push(`Название техники изменилось с "${oldTexnika.naimenovaniya_tex}" на "${updatedTexnika.naimenovaniya_tex}"`);
    }
    if (oldTexnika.inv_tex !== updatedTexnika.inv_tex) {
      changes.push(`Инвентарный номер изменился с "${oldTexnika.inv_tex}" на "${updatedTexnika.inv_tex}"`);
    }
    if (oldTexnika.seriyniy_nomer !== updatedTexnika.seriyniy_nomer) {
      changes.push(`Серийный номер изменился с "${oldTexnika.seriyniy_nomer}" на "${updatedTexnika.seriyniy_nomer}"`);
    }
    if (oldTexnika.mac_address !== updatedTexnika.mac_address) {
      changes.push(`MAC-адрес изменился с "${oldTexnika.mac_address}" на "${updatedTexnika.mac_address}"`);
    }

    description += changes.join(", ");

    // Texhistory jadvaliga yozuv qo'shish
    const historyQuery = `
      INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
      VALUES (NOW(), $1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const historyValues = [
      updatedTexnika.inv_tex,
      username,
      updatedTexnika.naimenovaniya_tex,
      updatedTexnika.status || "В рабочем состоянии", // Status qiymati mavjud bo'lmasa "Работает" deb belgilash
      description, // Yangi description
    ];
    await client.query(historyQuery, historyValues);

    // Transactionni yakunlaymiz
    await client.query("COMMIT");

    res.status(200).json({
      message: "Техника успешно обновлена",
      data: updatedTexnika,
    });
  } catch (err) {
    await client.query("ROLLBACK"); // Xato bo'lsa, transactionni bekor qilamiz
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release(); // Connectionni yopamiz
  }
};

const addTexnika = async (req, res) => {
  const { naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address , username } = req.body;

  const client = await pool.connect();

  try {
    // Transaction boshlaymiz
    await client.query("BEGIN");

    // faqat texnika jadvalini tekshiramiz
    const checkQuery = `
      SELECT 'texnika' AS table_name 
      FROM texnika 
      WHERE inv_tex = $1 OR seriyniy_nomer = $2 OR mac_address = $3;
    `;
    const checkResult = await client.query(checkQuery, [inv_tex, seriyniy_nomer, mac_address]);

    if (checkResult.rows.length > 0) {
      // Agar mavjud bo'lsa, xato qaytaramiz
      return res.status(400).json({
        message: `Техника с такими данными уже существует`,
      });
    }

    // texnika jadvaliga ma'lumot qo'shish
    const texnikaQuery = `
      INSERT INTO texnika (naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const texnikaValues = [naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address];
    const texnikaResult = await client.query(texnikaQuery, texnikaValues);

    // acception jadvaliga yozuv qo'shish
    const acceptionQuery = `
    INSERT INTO acception (naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address, podrazdelenie)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const acceptionValues = [
    naimenovaniya_tex,
    inv_tex,
    seriyniy_nomer,
    mac_address,
    "ИТ Суппорт", // Podrazdeleniy qiymati
  ];
    const acceptionResult = await client.query(acceptionQuery, acceptionValues);

    // texhistory jadvaliga yozuv qo'shish
    const historyQuery = `
      INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
      VALUES (NOW(), $1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const historyValues = [
      inv_tex,
      username,
      naimenovaniya_tex,
      "В рабочем состоянии", // Status qiymati
      "Новый компьютер был принят", // Description
    ];
    const historyResult = await client.query(historyQuery, historyValues);

    // Transactionni yakunlaymiz
    await client.query("COMMIT");

    res.status(201).json({
      message: "Техника успешно добавлена и зафиксирована в истории",
      texnikaData: texnikaResult.rows[0],
      acceptionData: acceptionResult.rows[0],
      historyData: historyResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK"); // Agar xato bo'lsa, transactionni bekor qilamiz
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release(); // Connectionni yopamiz
  }
};

const moveToTexnika = async (req, res) => {
  const { user } = req.body;  

  if (!user || !user.id) {
    return res.status(400).json({ message: "ID is required" });
  }

  const { id, inv_tex, status } = user; // Statusni olamiz
  const client = await pool.connect();

  try {
    // Transactionni boshlash
    await client.query("BEGIN");

    // texnika jadvalidan inv_tex bo'yicha ma'lumot olish
    const selectQuery = `SELECT * FROM texnika WHERE inv_tex = $1`;
    const selectResult = await client.query(selectQuery, [inv_tex]);

    if (selectResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Техника с указанным идентификатором не найдена" });
    }

    const texnikaData = selectResult.rows[0];

    // Statusni tekshirish
    if (status !== "В ремонте" && status !== "В нерабочем состоянии") {

      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid status provided" });
    }

    // texnika jadvalidagi statusni yangilash
    const updateQuery = `
      UPDATE texnika 
      SET status = $1
      WHERE inv_tex = $2
      RETURNING *;
    `;
    await client.query(updateQuery, ["В рабочем состоянии", inv_tex]);

    // texhistory jadvaliga yozuv qo'shish
    const historyQuery = `
      INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
      VALUES (NOW(), $1, $2, $3, $4, $5)
    `;
    const historyValues = [
      texnikaData.inv_tex,
      user.username, // Foydalanuvchi nomi
      texnikaData.naimenovaniya_tex,
      "В рабочем состоянии", // Yangi status
      "Техника была переведена в рабочее состояние",
    ];
    await client.query(historyQuery, historyValues);
    console.log(historyValues);


    // Agar status "В рабочем состоянии" ga o'tsa, acception jadvaliga yozuv qo'shish
    const acceptionQuery = `
      INSERT INTO acception (naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address, podrazdelenie)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const acceptionValues = [
      texnikaData.naimenovaniya_tex,
      texnikaData.inv_tex,
      texnikaData.seriyniy_nomer,
      texnikaData.mac_address,
      "ИТ Суппорт", // Podrazdelenie
    ];
    await client.query(acceptionQuery, acceptionValues);    

    // Transactionni yakunlash
    await client.query("COMMIT");

    res.status(200).json({
      message: "Техника успешно переведена в рабочее состояние",
    });
  } catch (err) {
    await client.query("ROLLBACK"); // Xato bo'lsa, transactionni bekor qilish
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release(); // Connectionni yopish
  }
};

const moveToRepair = async (req, res) => {
  const { user } = req.body;

  if (!user || !user.id) {
    return res.status(400).json({ message: "ID is required" });
  }

  const { id, inv_tex, status } = user;
  const client = await pool.connect();

  try {
    // Transactionni boshlash
    await client.query("BEGIN");

    // texnika jadvalidan inv_tex bo'yicha ma'lumot olish
    const selectQuery = `SELECT * FROM texnika WHERE inv_tex = $1`;
    const selectResult = await client.query(selectQuery, [inv_tex]);

    if (selectResult.rowCount === 0) {
      await client.query("ROLLBACK");
      console.log("Техника с указанным идентификатором не найдена");
      return res
        .status(404)
        .json({ message: "Техника с указанным идентификатором не найдена" });
    }

    const texnikaData = selectResult.rows[0];

    if (status === "В нерабочем состоянии") {
      // texnika jadvalida statusni "В ремонте" qilib yangilash
      const updateQuery = `
        UPDATE texnika
        SET status = $1
        WHERE inv_tex = $2
        RETURNING *;
      `;
      await client.query(updateQuery, ["В ремонте", inv_tex]);

      // texhistory jadvaliga yozuv qo'shish
      const historyQuery = `
        INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
        VALUES (NOW(), $1, $2, $3, $4, $5)
      `;
      const historyValues = [
        texnikaData.inv_tex,
        user.username,
        texnikaData.naimenovaniya_tex,
        "В ремонте",
        "Техника была переведена в ремонтное состояние",
      ];
      await client.query(historyQuery, historyValues);
    } else if (status === "В рабочем состоянии") {
      // Tekshirish: `acception` jadvalida mavjudligini tekshirish
      const acceptionQuery = `SELECT * FROM acception WHERE inv_tex = $1`;
      const acceptionResult = await client.query(acceptionQuery, [inv_tex]);

      if (acceptionResult.rowCount === 0) {
        await client.query("ROLLBACK");
        console.log("Техника в настоящее время находится у сотрудника");
        return res
          .status(400)
          .json({ message: "Техника в настоящее время находится у сотрудника" });
      }

      // acception jadvalidan yozuvni o'chirish
      const deleteAcceptionQuery = `
        DELETE FROM acception WHERE inv_tex = $1;
      `;
      await client.query(deleteAcceptionQuery, [inv_tex]);

      // texnika jadvalida statusni "В ремонте" qilib yangilash
      const updateQuery = `
        UPDATE texnika
        SET status = $1
        WHERE inv_tex = $2
        RETURNING *;
      `;
      await client.query(updateQuery, ["В ремонте", inv_tex]);

      // texhistory jadvaliga yozuv qo'shish
      const historyQuery = `
        INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
        VALUES (NOW(), $1, $2, $3, $4, $5)
      `;
      const historyValues = [
        texnikaData.inv_tex,
        user.username,
        texnikaData.naimenovaniya_tex,
        "В ремонте",
        "Техника была переведена в ремонтное состояние",
      ];
      await client.query(historyQuery, historyValues);
    } else {
      await client.query("ROLLBACK");
      console.log("Invalid status provided");
      return res.status(400).json({ message: "Invalid status provided" });
    }

    // Transactionni yakunlash
    await client.query("COMMIT");

    console.log("Transaction yakunlandi");

    res.status(200).json({
      message: "Техника успешно переведена в ремонтное состояние",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

const moveToUnused = async (req, res) => {
  const { user } = req.body;

  if (!user || !user.id) {
    return res.status(400).json({ message: "ID is required" });
  }

  const { id, inv_tex, status } = user;
  const client = await pool.connect();

  try {
    console.log("Transactionni boshlash");

    // Transactionni boshlash
    await client.query("BEGIN");

    console.log("texnika jadvalidan ma'lumot olish");

    // texnika jadvalidan inv_tex bo'yicha ma'lumot olish
    const selectQuery = `SELECT * FROM texnika WHERE inv_tex = $1`;
    const selectResult = await client.query(selectQuery, [inv_tex]);

    if (selectResult.rowCount === 0) {
      await client.query("ROLLBACK");
      console.log("Техника с указанным идентификатором не найдена");
      return res
        .status(404)
        .json({ message: "Техника с указанным идентификатором не найдена" });
    }

    const texnikaData = selectResult.rows[0];
    console.log("texnikaData: ", texnikaData);

    // Statusni tekshirish va mos amallarni bajarish
    if (status === "В рабочем состоянии") {
      // Tekshirish: `acception` jadvalida mavjudligini tekshirish
      const acceptionQuery = `SELECT * FROM acception WHERE inv_tex = $1`;
      const acceptionResult = await client.query(acceptionQuery, [inv_tex]);

      if (acceptionResult.rowCount === 0) {
        await client.query("ROLLBACK");
        console.log("Техника в настоящее время находится у сотрудника");
        return res
          .status(400)
          .json({ message: "Техника в настоящее время находится у сотрудника" });
      }

      console.log("acception jadvalidan yozuvni o'chirish");

      // `acception` jadvalidan yozuvni o'chirish
      const deleteAcceptionQuery = `DELETE FROM acception WHERE inv_tex = $1`;
      await client.query(deleteAcceptionQuery, [inv_tex]);
    } else if (status !== "В ремонте") {
      await client.query("ROLLBACK");
      console.log("Invalid status provided");
      return res.status(400).json({ message: "Invalid status provided" });
    }

    console.log("texnika jadvalidagi statusni yangilash");

    // texnika jadvalida statusni "В нерабочем состоянии" qilib yangilash
    const updateQuery = `
      UPDATE texnika
      SET status = $1
      WHERE inv_tex = $2
      RETURNING *;
    `;
    await client.query(updateQuery, ["В нерабочем состоянии", inv_tex]);

    console.log("texhistory jadvaliga yozuv qo'shish");

    // texhistory jadvaliga yozuv qo'shish
    const historyQuery = `
      INSERT INTO texhistory (data, inv_tex, username, naimenovaniya_tex, status, description)
      VALUES (NOW(), $1, $2, $3, $4, $5)
    `;
    const historyValues = [
      texnikaData.inv_tex,
      user.username,
      texnikaData.naimenovaniya_tex,
      "В нерабочем состоянии",
      "Техника была переведена в нерабочее состояние",
    ];
    await client.query(historyQuery, historyValues);

    // Transactionni yakunlash
    await client.query("COMMIT");

    console.log("Transaction yakunlandi");

    res.status(200).json({
      message: "Техника успешно переведена в нерабочее состояние",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// Acception functions

const readAcception = async (req, res) => {
  const { page = 1, size = 10, search = "" } = req.query;

  try {
    // Authorization headerni olish
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Tokenni olish

    // Tokenni tekshirish
    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    let user;
    try {
      user = generateToken(token);
    } catch (err) {
      return res.status(403).json({ message: "Invalid token" }); // Token noto'g'ri bo'lsa
    }

    const offset = (page - 1) * size;
    const queryParams = [];
    let query = `
      SELECT id, podrazdelenie, naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address, word_files,
        TO_CHAR(created_at, 'DD-MM-YYYY HH24:MI:SS') AS created_at
      FROM acception  
      WHERE 1=1
    `;

    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (podrazdelenie ILIKE $${queryParams.length} 
        OR naimenovaniya_tex ILIKE $${queryParams.length} 
        OR inv_tex ILIKE $${queryParams.length} 
        OR seriyniy_nomer ILIKE $${queryParams.length} 
        OR mac_address ILIKE $${queryParams.length})`;
    }

    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(query, queryParams);

    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) FROM acception 
      WHERE 1=1
    `;

    if (search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND (podrazdelenie ILIKE $${totalQueryParams.length} 
        OR naimenovaniya_tex ILIKE $${totalQueryParams.length} 
        OR inv_tex ILIKE $${totalQueryParams.length} 
        OR seriyniy_nomer ILIKE $${totalQueryParams.length} 
        OR mac_address ILIKE $${totalQueryParams.length})`;
    }

    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = totalResult.rows[0].count;

    res.status(200).json({
      message: "Data retrieved successfully",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Transfers funcsions
const readTransfers = async (req, res) => {
  const { page = 1, size = 10, search = "" } = req.query;

  try {
    // Authorization headerni olish
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Tokenni olish

    // Tokenni tekshirish
    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    let user;
    try {
      user = generateToken(token); // Tokenni tekshirish
    } catch (err) {
      return res.status(403).json({ message: "Invalid token" }); // Token noto'g'ri bo'lsa
    }

    const offset = (page - 1) * size;
    const queryParams = [];
    let query = `
      SELECT 
        id, 
        подразделение, 
        отдел, 
        должность, 
        серийный_номер, 
        кем_выдан, 
        наименование_техники, 
        инвентарный_номер_техники, 
        файл_pdf, 
        сотрудник, 
        фио, 
        мак_адресс,
        TO_CHAR(дата_выдачи_паспорта, 'DD-MM-YYYY') AS data_vydachi,
        TO_CHAR(дата, 'DD-MM-YYYY') AS data
      FROM transfered  
      WHERE 1=1
    `;

    // Agar search bo'lsa queryni yangilash
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (подразделение ILIKE $${queryParams.length} 
        OR отдел ILIKE $${queryParams.length} 
        OR должность ILIKE $${queryParams.length} 
        OR серийный_номер ILIKE $${queryParams.length} 
        OR кем_выдан ILIKE $${queryParams.length} 
        OR наименование_техники ILIKE $${queryParams.length} 
        OR инвентарный_номер_техники ILIKE $${queryParams.length} 
        OR сотрудник ILIKE $${queryParams.length} 
        OR фио ILIKE $${queryParams.length}
        OR мак_адресс ILIKE $${queryParams.length})`;
    }

    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    // Data olish
    const result = await pool.query(query, queryParams);

    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) FROM transfered 
      WHERE 1=1
    `;

    // Agar search mavjud bo'lsa, COUNT queryni yangilash
    if (search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND (подразделение ILIKE $${totalQueryParams.length} 
        OR отдел ILIKE $${totalQueryParams.length} 
        OR должность ILIKE $${totalQueryParams.length} 
        OR серийный_номер ILIKE $${totalQueryParams.length} 
        OR кем_выдан ILIKE $${totalQueryParams.length} 
        OR наименование_техники ILIKE $${totalQueryParams.length} 
        OR инвентарный_номер_техники ILIKE $${totalQueryParams.length} 
        OR сотрудник ILIKE $${totalQueryParams.length} 
        OR фио ILIKE $${totalQueryParams.length}
        OR мак_адресс ILIKE $${totalQueryParams.length})`;
    }

    // Jami olingan qatorlarni hisoblash
    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = totalResult.rows[0].count;

    // Yaxshi javobni yuborish
    res.status(200).json({
      message: "Data retrieved successfully",
      data: result.rows,
      total,
    });
  } catch (err) {
    // Xato bo'lsa errorni log qilish
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// History functions
const readHistory = async (req, res) => {
  const {
    page = 1,
    size = 10,
    search = "",
    filter = "",
    inv_tex = "",
  } = req.query;

  try {
    const offset = (page - 1) * size;
    const queryParams = [];
    let query = `
      SELECT id, naimenovaniya_tex, inv_tex, employee_fio, employee_podrazdelenie , status, word_file_path, username, data
      FROM history
      WHERE 1=1
    `;

    if (inv_tex) {
      queryParams.push(`%${inv_tex}%`);
      query += ` AND inv_tex ILIKE $${queryParams.length}`;
    }

    if (filter) {
      queryParams.push(`%${search}%`);
      query += ` AND ${filter} ILIKE $${queryParams.length}`;
    } else {
      if (search) {
        queryParams.push(`%${search}%`);
        query += ` AND username ILIKE $${queryParams.length}`;
      }
    }

    query += ` ORDER BY data DESC`;

    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(query, queryParams);

    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) FROM history WHERE 1=1
    `;

    if (inv_tex) {
      totalQueryParams.push(`%${inv_tex}%`);
      totalQuery += ` AND inv_tex ILIKE $${totalQueryParams.length}`;
    }

    if (filter) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND ${filter} ILIKE $${totalQueryParams.length}`;
    } else {
      if (search) {
        totalQueryParams.push(`%${search}%`);
        totalQuery += ` AND username ILIKE $${totalQueryParams.length}`;
      }
    }

    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = parseInt(totalResult.rows[0].count, 10);

    res.status(200).json({
      message: "История успешно получена",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Texhistory funcsion
const addTexHistory = async (req, res) => {
  const { inv_tex, username, naimenovaniya_tex } = req.body;

  try {
    const query = `
      INSERT INTO texhistory (inv_tex, username, naimenovaniya_tex)
      VALUES ($1, $2, $3)
    `;
    const values = [inv_tex, username, naimenovaniya_tex];

    await pool.query(query, values);
    res.status(201).json({ message: "Record added to texhistory successfully." });
  } catch (err) {
    console.error("Error inserting into texhistory:", err);
    res.status(500).json({ message: "Error adding to texhistory" });
  }
};

const readTexHistory = async (req, res) => {
  const { page = 1, size = 10, search = "", filter = "", inv_tex = "" } = req.query;

  // Log incoming query parameters from the request
  console.log("Request query parameters:", req.query);
  
  try {
    const offset = (page - 1) * size;
    const queryParams = [];
    let query = `
      SELECT id, naimenovaniya_tex, inv_tex, username, status, description, data
      FROM texhistory
      WHERE 1=1
    `;

    if (inv_tex) {
      queryParams.push(`%${inv_tex}%`);
      query += ` AND inv_tex ILIKE $${queryParams.length}`;
    }

    if (filter && search) {
      queryParams.push(`%${search}%`);
      query += ` AND ${filter} ILIKE $${queryParams.length}`;
    } else if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND username ILIKE $${queryParams.length}`;
    }

    // Pagination logic
    queryParams.push(size, offset);
    query += ` ORDER BY data DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    // Log the generated SQL query and query parameters
    console.log("Generated Query:", query);
    console.log("Query Params:", queryParams);

    const result = await pool.query(query, queryParams);

    const totalQueryParams = [];
    let totalQuery = `
      SELECT COUNT(*) 
      FROM texhistory
      WHERE 1=1
    `;

    if (inv_tex) {
      totalQueryParams.push(`%${inv_tex}%`);
      totalQuery += ` AND inv_tex ILIKE $${totalQueryParams.length}`;
    }

    if (filter && search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND ${filter} ILIKE $${totalQueryParams.length}`;
    } else if (search) {
      totalQueryParams.push(`%${search}%`);
      totalQuery += ` AND username ILIKE $${totalQueryParams.length}`;
    }

    // Log the total count query and its parameters
    console.log("Total Count Query:", totalQuery);
    console.log("Total Count Params:", totalQueryParams);

    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Log the final result before sending the response
    console.log("Total Count Result:", total);

    res.status(200).json({
      message: "Техника история успешно получена",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// download file
const downloadFile = (req, res) => {
  const { filePath } = req.params;  

    if (!filePath) {
        return res.status(400).json({ message: "Укажите путь к файлу." });
    }

    const decodedPath = decodeURIComponent(filePath);
    const absolutePath = path.join( decodedPath);

    fs.access(absolutePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error("Fayl mavjud emas:", err);
            return res.status(404).json({ message: "Файл не найден" });
        }

        // Fayl nomini olish
        const fileName = path.basename(absolutePath);
        res.download(absolutePath, fileName, (err) => {
            if (err) {
                console.error("Yuklashda xato:", err);
                res.status(500).json({ message: "Ошибка загрузки файла" });
            }
        });
    });
};
// acception funcsiya
const updatePdf = async (req, res) => {
  const jsonData = req.body;
  const outputFilePath = path.join(__dirname, '../public/files', 'output.pdf');

  // Shriftlar yo'li
  const fontPath = path.join(__dirname, 'fonts', 'TimesNewRomanPS-BoldMT.ttf'); // Qalin shrift
  const regularFontPath = path.join(__dirname, 'fonts', 'timesnewromanpsmt.ttf'); // Oddiy shrift

  try {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath); // Faylni o'chirib tashlash
    }

    // PDF hujjat yaratish
    const doc = new PDFDocument({
      margins: {
        top: 40,
        bottom: 40,
        left: 30,
        right: 30,
      },
      size: 'A4',
    });

    const writeStream = fs.createWriteStream(outputFilePath);
    doc.pipe(writeStream); // PDF yozishni boshlash

    // Oddiy shriftni yuklash
    doc.font(regularFontPath).fontSize(12);

    // Sana formatlash funksiyasi
    const formatDate = (inputDate) => {
      const dateParts = inputDate.split('.');
      const day = dateParts[0];
      const monthNumber = dateParts[1];
      const year = dateParts[2];

      const monthsInRussian = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];

      const monthName = monthsInRussian[parseInt(monthNumber, 10) - 1];
      return `« ${day} » ${monthName} ${year}`;
    };

    doc.moveDown(1);

    // Kiritilgan sanani formatlash
    const formattedDate = formatDate(jsonData.data || '30.09.2024'); // Agar data bo'lmasa, default sana

    // Sana va sarlavha
    doc.font(fontPath).fontSize(12).text(formattedDate, { align: 'right' });
    doc.moveDown(5);

    // "АКТ ПРИЕМА ПЕРЕДАЧИ" sarlavhasini chiqarish
    doc.font(fontPath).fontSize(12).text('АКТ ПРИЕМА-ПЕРЕДАЧИ', { align: 'center' });
    doc.moveDown(1);

    // Matnning birinchi qismi
    doc.font(regularFontPath).fontSize(12).text(
      `  Настоящий акт составлен о том, что Банк передает ${jsonData.employee_podrazdelenie } ` +
      `следующее: ${jsonData.order_name } ${jsonData.employee_fio } ` +
      `(паспорт: ${jsonData.employee_seria}, выдан: ${jsonData.employee_date }, ${jsonData.employee_viden }) ` +
      `получает нижеуказанные устройства.`,
      { align: 'left', indent: 40 }
    );
    doc.moveDown(1);
    // Matnning ikkinchi qismi
    doc.text(
      `  Прием-передачу нижеуказанной техники провел начальник Отдела эксплуатации информационных технологий Сайдалиходжаев Р.Б.: `,
      { align: 'left' }
    );
    doc.moveDown(2);

    // Jadval sarlavhalari va ma'lumotlar
    const tableHeaders = ['№', 'Наименование техники', 'Инвент. номер'];
    const tableData = [
      ['1', jsonData.naimenovaniya_tex, jsonData.inv_tex],
    ];

    // Jadval o'lchamlari
    const tableWidth = doc.page.width - 60; // O'ng va chap marginlarni hisobga olish
    const columnWidths = [0.1 * tableWidth, 0.7 * tableWidth, 0.2 * tableWidth]; // 10%, 70%, 20%
    const rowHeight = 20;
    let yPosition = doc.y; // Jadvalning boshlanish y koordinatasi

    // Jadvalni chizish
    doc.font(fontPath).fontSize(12); // Qalin shrift
    tableHeaders.forEach((header, index) => {
      const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0); // Har bir ustun kengligi
      doc.text(header, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });

      doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
    });

    yPosition += rowHeight;

    // Ma'lumotlarni ko'rsatish
    doc.font(regularFontPath); // Oddiy shrift
    tableData.forEach((row) => {
      row.forEach((cell, index) => {
        const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
        doc.text(cell, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });

        doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
      });
      yPosition += rowHeight;
    });

    yPosition += 100;

    // "Передал:" va boshqa qismlarni tayyorlash
    const titleText1 = 'Передал:';
    const titleText2 = 'Начальник Отдела эксплуатации информационных технологий'; // jsonData.position ni tekshiramiz
    const rightText = 'Сайдалиходжаев Р.Б.';

    const titleFontSize = 12;
    const titleX1Position = 30;
    const titleWidthLimit = 200;

    doc.font(fontPath).fontSize(titleFontSize).text(titleText1, titleX1Position, yPosition, { bold: true });
    const titleY2Position = yPosition + 15;
    doc.font(regularFontPath).text(titleText2, titleX1Position, titleY2Position, { width: titleWidthLimit, align: 'left' });

    const rightTextWidth = doc.widthOfString(rightText, { font: fontPath, fontSize: titleFontSize });
    const rightXPosition = doc.page.width - rightTextWidth - 30;
    doc.text(rightText, rightXPosition, titleY2Position);

    yPosition += 100;

    const titleText11 = 'Принял(а):';
    const titleText22 = jsonData.position || 'Начальник Отдела эксплуатации информационных технологий';
    const rightText3 = jsonData.new_employee_fio || '';

    const titleFontSize2 = 12;
    const titleX1Position2 = 30;
    const titleWidthLimit2 = 200;

    doc.font(fontPath).fontSize(titleFontSize2).text(titleText11, titleX1Position2, yPosition, { bold: true });
    const titleY2Position2 = yPosition + 15;
    doc.font(regularFontPath).text(titleText22, titleX1Position2, titleY2Position2, { width: titleWidthLimit2, align: 'left' });

    const rightTextWidth2 = doc.widthOfString(rightText3, { font: fontPath, fontSize: titleFontSize2 });
    const rightXPosition2 = doc.page.width - rightTextWidth2 - 30;
    doc.text(rightText3, rightXPosition2, titleY2Position2);

    doc.end();

    writeStream.on('finish', () => {
      // 200 success javobi
      res.status(200).send('PDF successfully created');
    });

    writeStream.on('error', (error) => {
      console.error('Error writing PDF:', error);
      res.status(500).send('Error creating PDF.');
    });


  } catch (error) {
    console.error('Error updating PDF:', error);
    res.status(500).send('Error updating PDF.');
  }
};
// transferfuncsiya
const updatePdfTransfer = async (req, res) => {
  const jsonData = req.body;
  const outputFilePath = path.join(__dirname, '../public/files', 'output.pdf');

  // Shriftlar yo'li
  const fontPath = path.join(__dirname, 'fonts', 'TimesNewRomanPS-BoldMT.ttf'); // Qalin shrift
  const regularFontPath = path.join(__dirname, 'fonts', 'timesnewromanpsmt.ttf'); // Oddiy shrift

  try {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath); // Faylni o'chirib tashlash
    }

    // PDF hujjat yaratish
    const doc = new PDFDocument({
      margins: {
        top: 40,
        bottom: 40,
        left: 30,
        right: 30,
      },
      size: 'A4',
    });

    const writeStream = fs.createWriteStream(outputFilePath);
    doc.pipe(writeStream); // PDF yozishni boshlash

    // Oddiy shriftni yuklash
    doc.font(regularFontPath).fontSize(12);

    // Sana formatlash funksiyasi
    const formatDate = (inputDate) => {
      const dateParts = inputDate.split('.');
      const day = dateParts[0];
      const monthNumber = dateParts[1];
      const year = dateParts[2];

      const monthsInRussian = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];

      const monthName = monthsInRussian[parseInt(monthNumber, 10) - 1];
      return `« ${day} » ${monthName} ${year}`;
    };

    doc.moveDown(1);

    // Kiritilgan sanani formatlash
    const formattedDate = formatDate(jsonData.data || '30.09.2024'); // Agar data bo'lmasa, default sana

    // Sana va sarlavha
    doc.font(fontPath).fontSize(12).text(formattedDate, { align: 'right' });
    doc.moveDown(5);

    // "АКТ ПРИЕМА ПЕРЕДАЧИ" sarlavhasini chiqarish
    doc.font(fontPath).fontSize(12).text('АКТ ПРИЕМА-ПЕРЕДАЧИ', { align: 'center' });
    doc.moveDown(1);

    // Matnning birinchi qismi
    doc.font(regularFontPath).fontSize(12).text(
      `  Настоящий акт составлен о том, что Банк передает ${jsonData.employee_podrazdelenie} ` +
      `следующее: ${jsonData.order_name} ${jsonData.employee_fio} ` +
      `(паспорт: ${jsonData.employee_seria}, выдан: ${jsonData.employee_date}, ${jsonData.employee_viden}) ` +
      `получает нижеуказанные устройства.`,
      { align: 'left', indent: 40 }
    );
    doc.moveDown(1);
    // Matnning ikkinchi qismi
    doc.text(
      `  Прием-передачу нижеуказанной техники провел начальник Отдела эксплуатации информационных технологий Сайдалиходжаев Р.Б.: sex`,
      { align: 'left' }
    );
    doc.moveDown(2);

    // Jadval sarlavhalari va ma'lumotlar
    const tableHeaders = ['№', 'Наименование техники', 'Инвент. номер'];
    const tableData = [
      ['1', jsonData.naimenovaniya_tex, jsonData.inv_tex],
    ];

    // Jadval o'lchamlari
    const tableWidth = doc.page.width - 60; // O'ng va chap marginlarni hisobga olish
    const columnWidths = [0.1 * tableWidth, 0.7 * tableWidth, 0.2 * tableWidth]; // 10%, 70%, 20%
    const rowHeight = 20;
    let yPosition = doc.y; // Jadvalning boshlanish y koordinatasi

    // Jadvalni chizish
    doc.font(fontPath).fontSize(12); // Qalin shrift
    tableHeaders.forEach((header, index) => {
      const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0); // Har bir ustun kengligi
      doc.text(header, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });

      doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
    });

    yPosition += rowHeight;

    // Ma'lumotlarni ko'rsatish
    doc.font(regularFontPath); // Oddiy shrift
    tableData.forEach((row) => {
      row.forEach((cell, index) => {
        const cellX = 30 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
        doc.text(cell, cellX, yPosition + 5, { width: columnWidths[index], align: 'center' });

        doc.rect(cellX, yPosition, columnWidths[index], rowHeight).stroke();
      });
      yPosition += rowHeight;
    });

    yPosition += 100;

    // "Передал:" va boshqa qismlarni tayyorlash
    const titleText1 = 'Передал:';
    const titleText2 = jsonData.position; // jsonData.position ni tekshiramiz
    const rightText = jsonData.new_employee_fio || '';

    const titleFontSize = 12;
    const titleX1Position = 30;
    const titleWidthLimit = 200;

    doc.font(fontPath).fontSize(titleFontSize).text(titleText1, titleX1Position, yPosition, { bold: true });
    const titleY2Position = yPosition + 15;
    doc.font(regularFontPath).text(titleText2, titleX1Position, titleY2Position, { width: titleWidthLimit, align: 'left' });

    const rightTextWidth = doc.widthOfString(rightText, { font: fontPath, fontSize: titleFontSize });
    const rightXPosition = doc.page.width - rightTextWidth - 30;
    doc.text(rightText, rightXPosition, titleY2Position);

    yPosition += 100;

    const titleText11 = 'Принял(а):';
    const titleText22 = 'Начальник Отдела эксплуатации информационных технологий';
    const rightText3 = 'Сайдалиходжаев Р.Б.';

    const titleFontSize2 = 12;
    const titleX1Position2 = 30;
    const titleWidthLimit2 = 200;

    doc.font(fontPath).fontSize(titleFontSize2).text(titleText11, titleX1Position2, yPosition, { bold: true });
    const titleY2Position2 = yPosition + 15;
    doc.font(regularFontPath).text(titleText22, titleX1Position2, titleY2Position2, { width: titleWidthLimit2, align: 'left' });

    const rightTextWidth2 = doc.widthOfString(rightText3, { font: fontPath, fontSize: titleFontSize2 });
    const rightXPosition2 = doc.page.width - rightTextWidth2 - 30;
    doc.text(rightText3, rightXPosition2, titleY2Position2);

    doc.end();

    writeStream.on('finish', () => {
      // 200 success javobi
      res.status(200).send('PDF transfer successfully created');
    });

    writeStream.on('error', (error) => {
      console.error('Error writing transfer PDF:', error);
      res.status(500).send('Error creating transfer PDF.');
    });

  } catch (error) {
    console.error('Error updating transfer PDF:', error);
    res.status(500).send('Error updating transfer PDF.');
  }
};


const sendPdf = (req, res) => {
  const fileName = req.body.fileName;

  if (!fileName) {
    return res.status(400).json({ error: 'File name is required' });
  }

  const pdfUrl = `http://localhost:5000/files/${fileName}`;
  res.json({ pdfUrl });
};

// Upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'E:/imom/ImomTogo rabota/server/public/files'); // Your specified location
  },
  filename: (req, file, cb) => {
    cb(null, 'output.pdf'); // Custom filename
  },
});

const upload = multer({ storage });

// Function to handle file upload
const uploadFile = (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save file' });
    }

    // Yuklangan fayl nomini qaytarish
    res.status(200).json({ success: true, fileName: req.file.filename }); // Fayl nomini qaytaring
  });
};

// Transfered ga qabul qilish
const addTransferedData = async (req, res) => {
  const {
    сотрудник,
    фио,
    подразделение,
    отдел,
    должность,
    серийный_номер,
    дата_выдачи_паспорта,
    кем_выдан,
    наименование_техники,
    инвентарный_номер_техники,
    файл_pdf,
    acception,
    мак_адресс,
  } = req.body;

  const sourcePath = path.join(__dirname, '../public/files', файл_pdf);
  const destPath = path.join(__dirname, '../public/acception', `${фио}.pdf`);

  try {
    // Faylni ko'chirish
    await fs.promises.copyFile(sourcePath, destPath);

    // acception jadvalidan mos yozuvni topish va o'chirish
    const deleteQuery = `DELETE FROM acception WHERE id = $1 AND inv_tex = $2 AND naimenovaniya_tex = $3 RETURNING *;`;
    const deleteValues = [acception.id, acception.inv_tex, acception.naimenovaniya_tex];
    const deleteResult = await pool.query(deleteQuery, deleteValues);

    // Agar mos yozuv topilmasa, xatolikni qaytaradi
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'No matching data in acception table' });
    }

    // O'chirilgan yozuvni history jadvaliga kiritish
    const historyQuery = `
      INSERT INTO history (data, inv_tex, employee_fio, employee_podrazdelenie, word_file_path, username, naimenovaniya_tex)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const historyValues = [
      new Date(),             // hozirgi vaqtni olish
      acception.inv_tex,
      фио,
      подразделение,
      destPath,
      сотрудник,
      acception.naimenovaniya_tex
    ];
    await pool.query(historyQuery, historyValues);

    // transfered jadvaliga yangi yozuv qo'shish
    const transferedQuery = `
  INSERT INTO transfered (сотрудник, фио, подразделение, отдел, должность, серийный_номер, дата_выдачи_паспорта, кем_выдан, наименование_техники, инвентарный_номер_техники, файл_pdf, мак_адресс)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  RETURNING *;
`;

const transferedValues = [
  сотрудник,
  фио,
  подразделение,
  отдел,
  должность,
  серийный_номер,
  дата_выдачи_паспорта,
  кем_выдан,
  наименование_техники,
  инвентарный_номер_техники,
  destPath, // Fayl yo'li
  мак_адресс, // Yangi ustun uchun qiymat
];
    const transferedResult = await pool.query(transferedQuery, transferedValues);

    res.status(201).json(transferedResult.rows[0]);

  } catch (error) {
    console.error("Xato:", error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Transfered dan chiqazib yuborish
const sendTransferData = async (req, res) => {
  const {
      id, // transfered jadvalidan o'chirilishi kerak bo'lgan yozuvning IDsi
      сотрудник,
      фио,
      подразделение,
      наименование_техники,
      файл_pdf, // Frontenddan keladigan 'файл_pdf'
      мак_адрес, // Frontenddan keladigan 'мак_адрес'
      transfers,
  } = req.body;
  

  // Fayl yo'llarini belgilash
  const sourcePath = path.join(__dirname, '../public/files', файл_pdf); // Kirish fayl yo'li
  const destPath = path.join(__dirname, '../public/transfered', `${фио}.pdf`); // Saqlash fayl yo'li

  try {
      // O'chirish so'rovi
      const deleteQuery = `
        DELETE FROM transfered 
        WHERE id = $1 AND "инвентарный_номер_техники" = $2 AND наименование_техники = $3 
        RETURNING *;
      `;

      const deleteValues = [
          id, // O'chirilishi kerak bo'lgan yozuvning ID
          transfers.инвентарный_номер_техники, // inv_tex
          наименование_техники // наименование_техники
      ];

      // O'chirish so'rovini bajarish
      const deleteResult = await pool.query(deleteQuery, deleteValues);

      // Agar yozuv o'chirilmagan bo'lsa, xatolik qaytarish
      if (deleteResult.rows.length === 0) {
          return res.status(404).json({ error: 'No matching data found in transfered table' });
      }

      // Faylni ko'chirish
      await fs.promises.copyFile(sourcePath, destPath); // Faylni sourcePath dan destPath ga ko'chirish

      // history jadvaliga yozish
      const historyQuery = `
        INSERT INTO history (data, inv_tex, employee_fio, employee_podrazdelenie, word_file_path, username, naimenovaniya_tex)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
      `;

      const historyValues = [
          new Date(), // hozirgi vaqtni olish
          transfers.инвентарный_номер_техники,
          фио,
          подразделение,
          destPath, // Fayl yo'li
          сотрудник,
          transfers.наименование_техники
      ];
      await pool.query(historyQuery, historyValues);

      // acception jadvaliga yozish
      const acceptionQuery = `
        INSERT INTO acception (id, created_at, naimenovaniya_tex, inv_tex, seriyniy_nomer, mac_address, word_files, podrazdelenie)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ИТ Суппорт') RETURNING *;
      `;

      const acceptionValues = [
          id, // id
          new Date(), // created_at
          наименование_техники, // naimenovaniya_tex
          transfers.инвентарный_номер_техники, // inv_tex
          transfers.серийный_номер, // Must be populated from appropriate source
          мак_адрес, // mac_address
          destPath, // Fayl yo'li
      ];

      // Acception jadvaliga yozish
      const acceptionResult = await pool.query(acceptionQuery, acceptionValues);

      res.status(200).json({ message: 'Data saved successfully', acception: acceptionResult.rows[0] });

  } catch (error) {
      console.error("Xato:", error);
      res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  // Users
  login,
  addUser,
  readUsers,
  editStatusUser,
  userDelete,
  userUpdate,
  userEditPassword,
  // Texnika
  readTexnika,
  updateTexnika,
  addTexnika,
  moveToTexnika,
  moveToRepair,
  moveToUnused,
  // acception
  readAcception,
  // transfers
  readTransfers,
  // History
  readHistory,
  addTexHistory,
  readTexHistory,
  // download
  downloadFile,
  // word file send 
  sendPdf,
  updatePdf,
  updatePdfTransfer,
  // Transfered add
  addTransferedData,
  // Transfered send
  sendTransferData,
  // Upload file
  uploadFile,
};
