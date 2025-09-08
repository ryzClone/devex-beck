const {
  getAllOperatingSystemsService,
  createOperatingSystemService,
  updateOperatingSystemService,
  deleteOperatingSystemService,
} = require("../services/OperatingSystemService");

// --- GET: hamma operating systemlarni olish (pagination bilan) ---
const getAllOperatingSystems = async (req, res) => {
  const { page = 1, size = 10 } = req.query;

  const operatingSystems = await getAllOperatingSystemsService({ page, size });

  res.status(200).json(operatingSystems);
};

// --- POST: yangi operating system qo‘shish ---
const createOperatingSystem = async (req, res) => {
  const { name, softwares } = req.body;   
  console.log({name , softwares});
  

  const result = await createOperatingSystemService({ name, softwares }); 

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(201).json({
    message: "Операционная система успешно добавлена!",
    operatingSystem: result.data,
  });
};

// --- PUT: operating system yangilash ---
const updateOperatingSystem = async (req, res) => {
  const { id } = req.params;
  const { name, softwares } = req.body;  // ✅ softwares qo‘shildi

  const updated = await updateOperatingSystemService(id, { name, softwares }); // ✅ object pass qilamiz

  res.status(updated.success ? 200 : 400).json(updated);
};

// --- DELETE: operating system o‘chirish ---
const deleteOperatingSystem = async (req, res) => {
  const { id } = req.params;

  const result = await deleteOperatingSystemService(id);

  if (result.success) {
    return res.status(200).json({ success: true, message: result.message });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
};

module.exports = {
  getAllOperatingSystems,
  createOperatingSystem,
  updateOperatingSystem,
  deleteOperatingSystem,
};
