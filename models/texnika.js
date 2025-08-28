module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  const Equipment = sequelize.define(
    "Equipment",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      inventory_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      serial_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mac_address: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "В рабочем состоянии",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: "equipment",
      timestamps: false,
    }
  );

  const EquipmentHistory = sequelize.define(
    "equipment_history",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      equipment_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "equipment",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      employee_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "employee",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      support_employee_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "support_employee",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      users_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      attachment_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "attachment",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: true,
      },
            action: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: "equipment_history",
      timestamps: false,
    }
  );

  return { Equipment, EquipmentHistory };
};
