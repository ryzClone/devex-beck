const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { generateToken } = require("../config/jwt");

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users_table WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    if (user) {
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
        res.status(401).json({ message: "Noto'g'ri ma'lumotlar" });
      }
    } else {
      res.status(401).json({ message: "Noto'g'ri ma'lumotlar" });
    }
  } catch (err) {
    console.error("Server xatosi:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

const addUser = async (req, res) => {
  const { username, password, role, status } = req.body;

  // Username va password bir xil bo'lsa, xatolik qaytarish
  if (username === password) {
    return res
      .status(400)
      .json({ message: "Username and password cannot be the same" });
  }

  try {
    // Avval foydalanuvchi mavjudligini tekshiring
    const existingUser = await pool.query(
      "SELECT * FROM users_table WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "User with this username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users_table (username, password, role, status, date) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id",
      [username, hashedPassword, role, status]
    );

    const userId = result.rows[0].id;

    res.status(201).json({
      message: "User created successfully",
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

    // Tartiblash: `status` bo'yicha
    query += ` ORDER BY
      CASE WHEN status = 'active' THEN 1
           WHEN status = 'disabled' THEN 2
           ELSE 3
      END,
      date DESC`;

    // Limit va offset
    queryParams.push(size, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    // So'rovni bajarish
    const result = await pool.query(query, queryParams);

    // Umumiy sonni hisoblash
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

    // Umumiy so'rovni bajarish
    const totalResult = await pool.query(totalQuery, totalQueryParams);
    const total = totalResult.rows[0].count;

    res.status(200).json({
      message: "Users retrieved successfully",
      data: result.rows,
      total,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const editStatus = async (req, res) => {
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
      return res.status(404).json({ message: "User not found or not updated" });
    }

    // Muvaffaqiyatli yangilanishni qaytarish
    res.status(200).json({
      message: "User status updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login, addUser, readUsers, editStatus };
