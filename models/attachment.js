const Attachment = sequelize.define("Attachment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER, // baytlarda
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING,
    defaultValue: "application/pdf",
  },
  created_by: {
    type: DataTypes.INTEGER, // user_id
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});
