module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  // 1. Position
  const Position = sequelize.define("Position", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "position",
    timestamps: false, // faqat created_at ishlatiladi
  });

  // 2. OperatingSystem
  const OperatingSystem = sequelize.define("OperatingSystem", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "operating_systems",
    timestamps: false,
  });

  // 3. InstalledSoftware
  const InstalledSoftware = sequelize.define("InstalledSoftware", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    operating_system_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "installed_software",
    timestamps: false,
  });

  // Aloqalar
  OperatingSystem.hasMany(InstalledSoftware, {
    foreignKey: "operating_system_id",
    onDelete: "CASCADE",
  });

  InstalledSoftware.belongsTo(OperatingSystem, {
    foreignKey: "operating_system_id",
  });

  return {
    Position,
    OperatingSystem,
    InstalledSoftware,
  };
};
