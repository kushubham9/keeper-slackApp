const Sequelize = require('sequelize')
const fs = require('fs')
const path = require('path')
const globalConstants = require('./../constants/global')

/**
 * Creating a MySQL Connection
 */
const sequelize = new Sequelize(globalConstants.MYSQL_HOST, {
  logging: console.log,
  benchmark: true,
  pool: {
    max: 20,
    min: 2,
    acquire: 10000,
    idle: 10000
  }
})

const db = {}
const appDir = path.dirname(require.main.filename)
const modelDir = './../mysql/models'
fs.readdirSync(path.join(appDir, modelDir)).filter(function (file) {
  return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js')
}).forEach(function (file) {
  const model = sequelize['import'](path.join(appDir, modelDir, file))
  db[model.name] = model
})

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
