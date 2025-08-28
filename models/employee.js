module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  const Employee = sequelize.define("Employee", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shortname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subdivision: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "position_table",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    passport_serial_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passport_given_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passport_given_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "employee",
    timestamps: false,
  });

 const SupportEmployee = sequelize.define("SupportEmployee", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shortname: {
      type: DataTypes.STRING,
      allowNull: true, // yoki false, agar kerak bo‘lsa majburiy qilasiz
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "support_employee",
    timestamps: false, // agar sizda createdAt, updatedAt yo‘q bo‘lsa
  });

  return { Employee , SupportEmployee};
};
