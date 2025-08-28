const {
  getAllPositionsService,
  createPositionService,
  updatePositionService,
  deletePositionService,
} = require("../services/PositionService");

// --- GET: hamma positionlarni olish (pagination bilan) ---
const getAllPositions = async (req, res) => {
  const { page = 1, size = 10 } = req.query; 

  const positions = await getAllPositionsService({ page, size });

  res.status(200).json(positions);
};
// --- POST: yangi position qo‘shish ---
const createPosition = async (req, res) => {
  const { name } = req.body;

  const result = await createPositionService(name);

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(201).json({
    message: "Должность успешно добавлена!",
    position: result.data
  });
};

// --- PUT: position yangilash ---
const updatePosition = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const updated = await updatePositionService(id, name);
  res.status(updated.success ? 200 : 400).json(updated);
};
// --- DELETE: position o‘chirish ---
const deletePosition = async (req, res) => {
  const { id } = req.params;
  const result = await deletePositionService(id);

  if (result.success) {
    return res.status(200).json({ success: true, message: result.message });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
};


module.exports = {
  getAllPositions,
  createPosition,
  updatePosition,
  deletePosition,
};
