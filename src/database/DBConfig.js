const IDatabase = require("./IDatabase");
/**
 * This file provide a global exports of the database instance to the rest of the application
 */
module.exports = new IDatabase();
if (!(module.exports instanceof IDatabase)) {
  throw new Error("The database is not an instance of IDatabase");
}
