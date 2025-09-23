const {
  getAllEmployeesService,
  createEmployeeService,
  updateEmployeeService,
  deleteEmployeeService,
} = require("../services/EmployeeService");

// --- GET: hamma employeelarni olish (pagination bilan) ---
const getAllEmployees = async (req, res) => {
  const { page = 1, size = 10 } = req.query;

  const employees = await getAllEmployeesService({ page, size });

  res.status(200).json(employees);
};

// --- POST: yangi employee qo‘shish ---
const createEmployee = async (req, res) => {
  const { fullname, shortname, positionId } = req.body;

  const result = await createEmployeeService({ fullname, shortname, positionId });

  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  res.status(201).json({
    message: "Сотрудник успешно добавлен!",
    employee: result.data,
  });
};

// --- PUT: employee yangilash ---
const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { fullname, shortname, positionId } = req.body;

  const updated = await updateEmployeeService(id, { fullname, shortname, positionId });
  res.status(updated.success ? 200 : 400).json(updated);
};

// --- DELETE: employee o‘chirish ---
const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  const result = await deleteEmployeeService(id);

  if (result.success) {
    return res.status(200).json({ success: true, message: result.message });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
