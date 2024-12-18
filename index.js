require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");

const app = express();
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:;");
  next();
});

app.use(express.json());

// Static fayllarni xizmat ko'rsatish
app.use(express.static(path.join(__dirname, 'public')));

app.use("/api", authRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
