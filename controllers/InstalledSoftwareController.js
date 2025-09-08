const {
  getAllInstalledSoftwareService,
  createInstalledSoftwareService,
  updateInstalledSoftwareService,
  deleteInstalledSoftwareService,
  getByIdInstalledSoftwareService,
} = require("../services/InstalledSoftwareService");

// --- GET ALL: hamma softwarelarni olish (pagination bilan) ---
const getAllInstalledSoftware = async (req, res) => {
  const { page = 1, size = 10 } = req.query;

  const result = await getAllInstalledSoftwareService({ page, size });

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(200).json(result);
};

// --- GET ONE: bitta software ---
const getByIdInstalledSoftware = async (req, res) => {
  const { id } = req.params;
  const result = await getByIdInstalledSoftwareService(id);

  if (!result.success) {
    return res.status(404).json({ message: result.message });
  }

  res.status(200).json(result);
};

// --- CREATE: yangi software qo‘shish ---
const createInstalledSoftware = async (req, res) => {
  const { name, operating_system_ids = [] } = req.body;

  console.log(operating_system_ids , name);
  

  const result = await createInstalledSoftwareService({ name, operating_system_ids });

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(201).json({
    message: "Программное обеспечение успешно добавлено!",
    data: result.data,
  });
};

// --- UPDATE: software yangilash ---
const updateInstalledSoftware = async (req, res) => {
  const { id } = req.params;
  const { name, operating_system_ids } = req.body;

  const result = await updateInstalledSoftwareService(id, { name, operating_system_ids });

  res.status(result.success ? 200 : 400).json(result);
};

// --- DELETE: software o‘chirish ---
const deleteInstalledSoftware = async (req, res) => {
  const { id } = req.params;

  const result = await deleteInstalledSoftwareService(id);

  res.status(result.success ? 200 : 400).json(result);
};

module.exports = {
  getAllInstalledSoftware,
  getByIdInstalledSoftware,
  createInstalledSoftware,
  updateInstalledSoftware,
  deleteInstalledSoftware,
};
