module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "active",
      },
      state: {
        type: DataTypes.STRING,
        defaultValue: "enabled",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "users",
      timestamps: false,
    }
  );

  const UserHistory = sequelize.define(
    "UserHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "users_history",
      timestamps: false,
      underscored: true,
    }
  );

  // Association
  User.hasMany(UserHistory, { foreignKey: "user_id", as: "histories" });
  UserHistory.belongsTo(User, { foreignKey: "user_id", as: "user_histories" });

  return { User, UserHistory };
};
