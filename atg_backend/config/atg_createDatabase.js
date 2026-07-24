const driver = require("mariadb");
const { systemLogger } = require("./atg_logger");

function getDatabaseConfig() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD } = process.env;
  return {
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    allowPublicKeyRetrieval: true,
    connectTimeout: 10000,
  };
}

module.exports = async function createDatabaseIfNotExists() {
  const client = await driver.createConnection(getDatabaseConfig());
  const databaseName = process.env.DB_NAME;

  try {
    const statement = "CREATE DATABASE IF NOT EXISTS `" + databaseName + "`";
    await client.query(statement);
    systemLogger.info('Database "' + databaseName + '" checked/created');
  } finally {
    await client.end();
  }
};
