const {
  getAllSupportEmployeesService,
  createSupportEmployeeService,
  updateSupportEmployeeService,
  deleteSupportEmployeeService,
} = require("../services/EmployeeSupportService");

// --- GET: hamma support employeelarni olish (pagination bilan) ---
const getAllSupportEmployees = async (req, res) => {
  const { page = 1, size = 10 } = req.query;

  const employees = await getAllSupportEmployeesService({ page, size });

  res.status(200).json(employees);
};

// --- POST: yangi support employee qo‘shish ---
const createSupportEmployee = async (req, res) => {
  const { fullname, shortname } = req.body;

  const result = await createSupportEmployeeService({ fullname, shortname });

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(201).json({
    message: "Сотрудник успешно добавлен!",
    employee: result.data,
  });
};

// --- PUT: support employee yangilash ---
const updateSupportEmployee = async (req, res) => {
  const { id } = req.params;
  const { fullname, shortname } = req.body;

  const updated = await updateSupportEmployeeService(id, { fullname, shortname });
  res.status(updated.success ? 200 : 400).json(updated);
};

// --- DELETE: support employee o‘chirish ---
const deleteSupportEmployee = async (req, res) => {
  const { id } = req.params;
  const result = await deleteSupportEmployeeService(id);

  if (result.success) {
    return res.status(200).json({ success: true, message: result.message });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
};

module.exports = {
  getAllSupportEmployees,
  createSupportEmployee,
  updateSupportEmployee,
  deleteSupportEmployee,
};
