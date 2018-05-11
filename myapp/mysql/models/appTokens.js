module.exports = (sequelize, DataTypes) => {
  const appTokens = sequelize.define('appTokens', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    teamId: {
      type: DataTypes.CHAR(255),
      allowNull: false,
    },
    apiToken: {
      type: DataTypes.CHAR(255),
      allowNull: false,
    },
  }, {
    tableName: 'appTokens',
    timestamps: true
  })
  return appTokens
}
