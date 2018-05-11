/* jshint indent: 2 */
module.exports = (sequelize, DataTypes) => {
  const encryptedData = sequelize.define('encryptedData', {
    rId: {
      type: DataTypes.CHAR(255),
      allowNull: false,
      primaryKey: true,
    },
    data: {
      type: DataTypes.TEXT(),
      allowNull: false,
    },
    title: {
      type: DataTypes.CHAR(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'encryptedData',
    timestamps: true
  })
  return encryptedData
}
