const IDatabase = require("./IDatabase");
const RedisCachedDatabase = require("./RedisCachedDatabase");
const PostgresDatabase = require("./PostgresDatabase");
/**
 * This file provide a global exports of the database instance to the rest of the application
 * @type {IDatabase}
 */
if (process.env.REDIS_HOST && process.env.REDIS_PASS) {
  module.exports = new RedisCachedDatabase();
} else {
  module.exports = new PostgresDatabase();
}
if (!(module.exports instanceof IDatabase)) {
  throw new Error("The database is not an instance of IDatabase");
}
