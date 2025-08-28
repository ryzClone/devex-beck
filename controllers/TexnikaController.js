const texnikaService = require("../services/texnikaService");
const logger = require("../utils/logger");

const readEquipment = (req, res) => {
  const {
    page = 1,
    size = 10,
    search = "",
    filter = "",
    status = "",
  } = req.query;

  texnikaService
    .getEquipment({
      page: parseInt(page),
      size: parseInt(size),
      search,
      filter,
      status,
    })
    .then((result) => {
      res.status(200).json({
        message: "Данные успешно получены.",
        data: result.data,
        total: result.total,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Не удалось получить данные.",
        error: error.message,
      });
    });
};

const addEquipment = (req, res) => {
  const {
    name,
    inventory_number,
    serial_number,
    mac_address,
    users_id,
    support_employee_id,
    description, // optional
    action,      // optional
  } = req.body;

  texnikaService
    .addEquipment({
      name,
      inventory_number,
      serial_number,
      mac_address,
      users_id,
    })
    .then((result) => {
      res.status(201).json({
        message: "Техника успешно добавлена и зафиксирована в истории",
        data: result,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: error.message || "Ошибка сервера",
      });
    });
};

const updateEquipment = (req, res) => {
  const {
    id,
    name,
    inventory_number,
    serial_number,
    mac_address,
    users_id,
    support_employee_id,
    description,
    action,
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID обязателен" });
  }

  texnikaService.updateEquipment({
    id,
    name,
    inventory_number,
    serial_number,
    mac_address,
    users_id,
    support_employee_id,
    description: description || "Обновление техники",
    action: action || "Обновление",
  })
    .then((result) => {
      res.status(200).json({
        message: "Оборудование успешно обновлено",
        data: result,
      });
    })
    .catch((err) => {
      logger.error(`Ошибка при обновлении оборудования: ${err.message}`);
      res.status(500).json({ message: "Ошибка сервера" });
    });
};

const moveToEquipment = async (req, res) => {
  const { equipment_id, users_id } = req.body;

  if (!equipment_id || !users_id) {
    return res.status(400).json({ message: "equipment_id и users_id обязательны" });
  }

  await texnikaService.moveToEquipment({ equipment_id, users_id });

  res.json({ message: "Техника успешно переведена в рабочее состояние" });
};

const moveToRepair = async (req, res) => {
  const { equipment_id, users_id } = req.body;

  if (!equipment_id || !users_id) {
    return res.status(400).json({ message: "equipment_id и users_id обязательны" });
  }

  await texnikaService.moveToRepair({ equipment_id, users_id });

  res.status(200).json({
    message: "Техника успешно переведена в ремонтное состояние",
  });
};

const moveToUnused = async (req, res) => {
  const { equipment_id, users_id } = req.body;

  if (!equipment_id || !users_id) {
    return res.status(400).json({ message: "equipment_id и users_id обязательны" });
  }

  await texnikaService.moveToUnused({ equipment_id, users_id });

  res.status(200).json({
    message: "Техника успешно переведена в нерабочее состояние",
  });
};

module.exports = {
  readEquipment,
  updateEquipment,
  addEquipment,
  moveToEquipment,
  moveToRepair,
  moveToUnused,
};
