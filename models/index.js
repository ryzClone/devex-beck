const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 🧩 Modellarni ulash
const UserModels = require("./user")(sequelize, Sequelize);
db.User = UserModels.User;
db.UserHistory = UserModels.UserHistory;

const otherModels = require("./position")(sequelize, Sequelize);
db.Position = otherModels.Position;
db.InstalledSoftware = otherModels.InstalledSoftware;   // ✅ qo‘shildi
db.OperatingSystem = otherModels.OperatingSystem;       // ✅ qo‘shildi

// texnika
const texnikaModels = require("./texnika")(sequelize, Sequelize);
db.Equipment = texnikaModels.Equipment;
db.EquipmentHistory = texnikaModels.EquipmentHistory;

// employee
const employeeModels = require("./employee")(sequelize, Sequelize);
db.Employee = employeeModels.Employee;
db.SupportEmployee = employeeModels.SupportEmployee;

// EquipmentHistory bog‘lanishlari
db.EquipmentHistory.belongsTo(db.Equipment, { as: "equipment", foreignKey: "equipment_id" });
db.EquipmentHistory.belongsTo(db.User, { as: "user", foreignKey: "users_id" });
db.EquipmentHistory.belongsTo(db.Employee, { as: "employee", foreignKey: "employee_id" });
db.EquipmentHistory.belongsTo(db.SupportEmployee, { as: "support_employee", foreignKey: "support_employee_id" });

// Employee -> Position
db.Employee.belongsTo(db.Position, { foreignKey: 'position_id', as: 'position' });

// ✅ UserHistory bog‘lanishlari
db.UserHistory.belongsTo(db.Equipment, {
  foreignKey: "entity_id",
  targetKey: "id",
  as: "equipment_entity",
  constraints: false,
});

db.UserHistory.belongsTo(db.Employee, {
  foreignKey: "entity_id",
  targetKey: "id",
  as: "employee_entity",
  constraints: false,
});

db.UserHistory.belongsTo(db.SupportEmployee, {
  foreignKey: "entity_id",
  targetKey: "id",
  as: "support_employee_entity",
  constraints: false,
});

module.exports = db;
