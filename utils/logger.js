// logger.js
const { createLogger, format, transports } = require("winston");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// === Sana formatlash uchun yordamchi ===
const pad = (n) => n.toString().padStart(2, "0");

// === Log papkasi yo'li ===
const logsBaseDir = path.join(__dirname, "../logs");
const currentLogFile = path.join(logsBaseDir, "logs.log");

// === Papkani yaratish ===
if (!fs.existsSync(logsBaseDir)) {
  fs.mkdirSync(logsBaseDir, { recursive: true });
}

// === Mavjud logni arxivlash ===
function compressLogsOnRestart() {
  try {
    if (!fs.existsSync(currentLogFile) || fs.statSync(currentLogFile).size === 0) {
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hour = pad(now.getHours());
    const minute = pad(now.getMinutes());

    const archiveDir = path.join(logsBaseDir, `${year}-${month}`);
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archiveFile = path.join(archiveDir, `log_${day}_${hour}-${minute}.log.gz`);

    const input = fs.createReadStream(currentLogFile);
    const output = fs.createWriteStream(archiveFile);
    const gzip = zlib.createGzip();

    input.pipe(gzip).pipe(output).on("finish", () => {
      fs.truncate(currentLogFile, 0, () => {
        console.log(`✅ Log archived to: ${archiveFile}`);
      });
    });
  } catch (err) {
    console.error("❌ Log compression error:", err);
  }
}

// === Log formatini belgilaymiz ===
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta)
      .map((key) => `${key}: ${JSON.stringify(meta[key], null, 2)}`)
      .join("\n");

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr ? `\n${metaStr}` : ""}\n`;
  })
);

// === Loggerni yaratamiz ===
const logger = createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new transports.File({
      filename: currentLogFile,
      level: "info",
    }),
  ],
});

// === Agar dev bo'lsa console transport qo'shamiz ===
if (process.env.NODE_ENV === "development") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

// === Dastur boshlanishida mavjud logni siqib qo'yish ===
compressLogsOnRestart();

module.exports = logger;
