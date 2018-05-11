/* jshint indent: 2 */
module.exports = (sequelize, DataTypes) => {
  const encryptionKey = sequelize.define('encryptionKey', {
    rId: {
      type: DataTypes.CHAR(255),
      allowNull: false,
      primaryKey: true,
    },
    key: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },
  }, {
    tableName: 'encryptionKey',
    timestamps: true
  })
  return encryptionKey
}
