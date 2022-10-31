const IDatabase = require("./IDatabase");
const { Pool, Client } = require("pg");

// client.query(`select * from premier.user_details`, (err, result) => {
//   if (!err) {
//     console.log(result.rows);
//   }
//   client.end();
// });

class PostgresDatabase extends IDatabase {
  constructor() {
    /**
     * @type {Pool}
     */
    this.pool = new Pool({
      host: "localhost",
      user: "postgres",
      port: 5432,
      password: "postgres",
      database: "premier_project",
    });
    this.pool.on("error", (err, _client) => {
      console.error("Postgres: Something went wrong!!!!");
      console.error(err);
      process.exit(-1);
    });
  }

  async init() {}

  async shutdown() {}

  /**
   * @callback query_exec
   * @param {Client} client
   * @returns {any}
   */
  /**
   * Perform query
   * @param {query_exec} query_exec
   */
  async #doConnected(query_exec) {
    const client = await this.pool.connect();
    try {
      return await query_exec(client);
    } catch (e) {
      console.log(e.stack);
      return null;
    } finally {
      client.release();
    }
  }

  async addVerificationCode(email, code) {
    await this.#doConnected(async function (client) {
      await client.query(
        `INSERT INTO premier.verification
        (verification_email,verification_code) 
        VALUES ($1,$2)`,
        [email, code]
      );
    });
  }

  async verifyVerificationCode(code) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT verification_email FROM premier.verification 
        WHERE verification_code=$1`,
        [code]
      );
      return result.rows[0]?.verification_email ?? null;
    });
  }

  async obtainUserPasswordHash(id) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT pwd FROM premier.user_details 
        WHERE username=$1 OR email = $1`,
        [id]
      );
      return result.rows[0]?.pwd ?? null;
    });
  }

  async addUser(user, password) {}

  async getUser(loginid) {}

  async updateUserSubtle(loginid, changes) {}

  async recordAccessToken(token, loginid) {}

  async touchAccessToken(token) {}

  async touchAccessToken(token) {}

  async getCategories() {}

  async getProducts(search, offset = 0, limit = 50, randomize = false) {}

  async getProductsByCategory(
    category,
    search,
    offset = 0,
    limit = 50,
    randomize = false
  ) {}

  async getOrdersOfUser(loginid) {}

  async getUserOrder(loginid, orderid) {}

  async _expandOrderDetails(order) {}

  async getUserCart(loginid) {}

  async updateOrderSubtle(orderid, changes) {}

  async addTransaction(tx) {}

  async getTransaction(loginid, txid) {}

  async updateTransactionSubtle(txid, changes) {}
}
