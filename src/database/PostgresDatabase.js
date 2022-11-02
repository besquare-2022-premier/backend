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
      host: process.env.POSTGRES_SERVER,
      user: process.env.POSTGRES_USER,
      port: process.env.POSTGRES_PORT,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
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

  async voidVerificationCode(code) {
    await this.#doConnected(async function (client) {
      await client.query(
        `DELETE FROM premier.verification
        WHERE verification_code = $1`,
        [code]
      );
    });
  }

  async obtainUserPasswordHash(id) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT pwd FROM premier.user_details 
        WHERE username=$1 OR email = $1 OR loginid = $1`,
        [id]
      );
      return result.rows[0]?.pwd ?? null;
    });
  }

  //need checking
  async addUser(user, password) {
    await this.#doConnected(async function (client) {
      await client.query(
        `INSERT INTO premier.user_details(
          loginid, fname, lname, username, email, pwd,
          tel_no, residence, address, birthday, gender, secure_word
        )
        VALUES ($1.loginid, $1.firstname, $1.lastname,
          $1.username, $1.email, $2, $1.tel_no, $1.residence,
          $1.address, $1.birthday, $1.gender, $1.secure_word)`,
        [user, password]
      );
    });
  }

  async getUser(loginid) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.user_details
        WHERE loginid = $1`,
        [loginid]
      );
      return result.rows[0]?.loginid ?? null;
    });
  }

  //need checking
  async updateUserSubtle(loginid, changes) {
    await this.#doConnected(async function (client) {
      await client.query(
        `UPDATE premier.user_details
        SET $2
        WHERE loginid = $1`,
        [loginid, changes]
      );
    });
  }

  async recordAccessToken(token, loginid) {}

  async touchAccessToken(token) {}

  async revokeAccessToken(token) {}

  async getUserSecureWord(id) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT secure_word FROM premier.user_details
        WHERE username = $1 OR email = $1`,
        [id]
      );
      return result.rows[0]?.secure_word ?? null;
    });
  }

  async getCategories() {
    await this.#doConnected(async function (client) {
      let result = await client.query(`SELECT * FROM premier.category`);
      return result.rows[0] ?? null;
    });
  }

  async getProducts(search, offset = 0, limit = 50, randomize = false) {
    let params = [offset, limit];
    if (search) params.push(`%${search}%`);
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.product
        WHERE (stock >0 or stock =-1) ${
          search ? "  AND product_name LIKE $3  " : ""
        }
        ${randomize ? " ORDER BY RANDOM() " : ""}
        OFFSET $1
        LIMIT $2`,
        params
      );
      return result.rows[0] ?? null;
    });
  }

  async getProductsByCategory(
    category,
    search,
    offset = 0,
    limit = 50,
    randomize = false
  ) {
    let params = [category, offset, limit];
    if (search) params.push(`%${search}%`);
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT c.category_name, p.*
        FROM premier.product AS p
        INNER JOIN premier.category AS c
	        ON c.categoryid = p.categoryid
        WHERE c.category_name = $1
          AND (stock > 0 or stock stock =-1) ${
            search ? " AND product_name like $4 " : ""
          }
          ${randomize ? "ORDERBY RANDOM() " : ""}
        OFFSET $2
        LIMIT $3`,
        params
      );
      return result.rows[0] ?? null;
    });
  }

  async getOrdersOfUser(loginid) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * from premier.orders
        WHERE loginid = $1`,
        [loginid]
      );
      return result.rows[0] ?? null;
    });
  }

  async getUserOrder(loginid, orderid) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT ud.username, ud.email, ud.tel_no,
	        od.*, o.ship_address, o.country
        FROM premier.user_details AS ud
        INNER JOIN premier.orders AS o
	        ON ud.loginid = o.loginid
        INNER JOIN premier.order_details AS od
	        ON o.orderid = od.orderid
        WHERE ud.loginid = $1 AND o.orderid = $2`
      );
      [loginid, orderid];
      return result.rows[0] ?? null;
    });
  }

  async _expandOrderDetails(order) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT o.*, od.productid, od.quantity, od.price
        FROM premier.orders AS o
        INNER JOIN premier.order_details AS od
	      ON o.orderid = od.orderid`
      );
      return result.rows[0] ?? null;
    });
  }

  async getUserCart(loginid) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT o.orderid FROM premier.orders AS o
        WHERE o.loginid = $1 AND NOT EXISTS
        (SELECT t.orderid FROM premier.transaction AS t
          WHERE o.orderid = t.orderid)`
      );
      return result.rows[0] ?? null;
    });
  }

  async updateOrderSubtle(orderid, changes) {}

  // async addTransaction(tx) {
  //   await this.#doConnected(async function (client) {
  //     await client.query(
  //       `INSERT INTO premier.transaction
  //       VALUES ($1)`,
  //       [tx]
  //     );
  //   });
  // }

  async getTransaction(loginid, txid) {
    await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.transaction
        WHERE loginid = $1 AND transactionid = $2`,
        [loginid, txid]
      );
      return result.rows[0] ?? null;
    });
  }

  async updateTransactionSubtle(txid, changes) {}
}
