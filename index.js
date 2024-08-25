require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use("/api", authRoutes); // Ensure this line is present

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
