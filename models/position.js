module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  // 1️⃣ Position modeli
  const Position = sequelize.define(
    "Position",
    {
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
    },
    {
      tableName: "position",
      timestamps: false,
    }
  );

  // 2️⃣ OperatingSystem modeli
  const OperatingSystem = sequelize.define(
    "OperatingSystem",
    {
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
    },
    {
      tableName: "operating_systems",
      timestamps: false,
    }
  );

  // 3️⃣ InstalledSoftware modeli
  const InstalledSoftware = sequelize.define(
    "InstalledSoftware",
    {
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
    },
    {
      tableName: "installed_software",
      timestamps: false,
    }
  );

InstalledSoftware.belongsToMany(OperatingSystem, {
  through: "os_installed_software",
  foreignKey: "software_id",
  otherKey: "operating_system_id",
  as: "operating_systems",
  timestamps: false,
});

OperatingSystem.belongsToMany(InstalledSoftware, {
  through: "os_installed_software",
  foreignKey: "operating_system_id",
  otherKey: "software_id",
  as: "softwares",
  timestamps: false,
});




  return {
    Position,
    OperatingSystem,
    InstalledSoftware,
  };
};
