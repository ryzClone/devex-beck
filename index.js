require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./models"); // Sequelize model/index.js
const authRoutes = require("./routes/authRoutes");
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 5000;

// === Middlewarelar === //

// JSON formatdagi so'rovlar uchun body parser
app.use(express.json());

// Static fayllar
app.use(express.static(path.join(__dirname, "public")));

// CORS sozlamalari
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3000/website",
      "http://localhost:3000/website/users",
      "http://localhost:3000/website/texnika",
      "http://localhost:3000/website/texnika/repair",
      "http://localhost:3000/website/texnika/unused",
      "http://localhost:3000/website/texnikachart",
      "http://localhost:3000/website/transfers",
      "http://localhost:3000/website/editpassword",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// CSP (Content Security Policy) – xavfsizlikni oshirish
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:;"
  );
  next();
});

// So'rovlar loggeri
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`, {
    body: req.body,
    user: req.user?.username || 'anon'
  });
  next();
});

// === Routerni ulash === //
app.use("/api", authRoutes);

// === 404 Handler (route topilmasa) === //
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// === Xatoliklarni tutuvchi middleware (oxirida bo'lishi kerak) === //
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  logger.error(`Error on ${req.method} ${req.url}`, {
    user: req.user?.username || 'anon',
    errorMessage: err.message,
    errorStack: err.stack,
    body: req.body,
  });

  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// === Bazaga ulanish va serverni ishga tushirish === //
db.sequelize.authenticate()
  .then(() => db.sequelize.sync({ force: false }))
  .then(() => {
    app.listen(port, () => {
      logger.info(`🚀 Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    logger.info("❌ Unable to connect to the database:", error);
  });

module.exports = app;
