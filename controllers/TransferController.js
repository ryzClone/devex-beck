const transferService = require("../services/transferService");
const { generateToken } = require("../config/jwt");


// Acception functions
const readAcception = async (req, res) => {
  const { page = 1, size = 10, search = "" } = req.query;

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token required" });
  }

  let user;
  try {
    user = generateToken(token);
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }

  try {
    const { data, total, positionTable } = await transferService.readAcception(
      Number(page),
      Number(size),
      search
    );

    res.status(200).json({
      message: "Data retrieved successfully",
      data,
      total,
      positionTable,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Transfers funcsions
const readTransfers = async (req, res) => {
  const { page = 1, size = 10, search = "" } = req.query;

  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    let user;
    try {
      user = generateToken(token);
    } catch (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const { data, total , positionTable} = await transferService.getTransfers({ page, size, search });

    res.status(200).json({
      message: "Data retrieved successfully",
      data,
      total,
      positionTable,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const addTransferedData = async (req, res) => {
  try {
    const transferData = req.body;
    const result = await transferService.addTransferedData(transferData);
    res.status(201).json(result);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
  
const sendTransferData = async (req, res) => {
  try {
      const result = await transferService.processTransferData(req.body);
      res.status(200).json({ message: 'Data saved successfully', acception: result });
  } catch (error) {
      console.error("Xato:", error);
      res.status(500).json({ error: 'Server error' });
  }
};

  

module.exports = {
  // AcceptionView
  readAcception,
    // Transfer view
    readTransfers,
    // Transfered add
    addTransferedData,
    // Transfered send
    sendTransferData,
  };
  