const IDatabase = require("./IDatabase");
const RedisCachedDatabase = require("./RedisCachedDatabase");
// const PostgresDatabase = require("./PostgresDatabase");
/**
 * This file provide a global exports of the database instance to the rest of the application
 * @type {IDatabase}
 */
module.exports = new RedisCachedDatabase();
if (!(module.exports instanceof IDatabase)) {
  throw new Error("The database is not an instance of IDatabase");
}
