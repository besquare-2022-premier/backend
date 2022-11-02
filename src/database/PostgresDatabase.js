const IDatabase = require("./IDatabase");
// eslint-disable-next-line no-unused-vars
const { Pool, Client } = require("pg");
const Product = require("../models/product");
const User = require("../models/user");

// client.query(`select * from premier.user_details`, (err, result) => {
//   if (!err) {
//     console.log(result.rows);
//   }
//   client.end();
// });

class PostgresDatabase extends IDatabase {
  constructor() {
    super();
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
    this.pool.on("error", (err) => {
      console.error("Postgres: Something went wrong!!!!");
      console.error(err);
      process.exit(-1);
    });
  }

  async init() {}

  async shutdown() {
    await this.pool.end();
  }

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
    let result = await this.#doConnected(async function (client) {
      await client.query(
        `INSERT INTO premier.verification
        (verification_email,verification_code) 
        VALUES ($1,$2) ON CONFLICT (verification_email) DO UPDATE 
        SET verification_code=excluded.verification_code`,
        [email, code]
      );
    });
    return result !== null;
  }

  async verifyVerificationCode(code) {
    return await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT verification_email FROM premier.valid_verification_codes 
        WHERE verification_code=$1`,
        [code]
      );
      return result.rows[0]?.verification_email ?? null;
    });
  }

  async voidVerificationCode(code) {
    let result = await this.#doConnected(async function (client) {
      await client.query(
        `DELETE FROM premier.verification
        WHERE verification_code = $1`,
        [code]
      );
    });
    return result !== null;
  }

  async obtainUserPasswordHash(id) {
    let ret = await this.#doConnected(async function (client) {
      const isInteger = typeof id === "number";
      let result = await client.query(
        `SELECT loginid,pwd FROM premier.user_details 
        WHERE ${isInteger ? "loginid=$1" : "username=$1 OR email = $1"}`,
        [id]
      );
      return result.rows[0] ?? null;
    });
    if (!ret || !ret.loginid || !ret.pwd) {
      return null;
    }
    return {
      loginid: ret.loginid,
      hash: ret.pwd,
    };
  }

  //need checking
  async addUser(user, password) {
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `INSERT INTO premier.user_details(
          fname, lname, username, email, pwd,
          tel_no, residence, address, birthday, gender, secure_word
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 , $10, $11) RETURNING loginid`,
        [
          user.firstname,
          user.lastname,
          user.username,
          user.email,
          password,
          user.tel_no,
          user.residence,
          user.address,
          user.birthday,
          user.gender,
          user.secure_word,
        ]
      );
      return result.rows[0]?.loginid ?? null;
    });
    if (!result) {
      return false;
    }
    user.loginid = result;
    return true;
  }

  async getUser(loginid) {
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.user_details
        WHERE loginid = $1`,
        [loginid]
      );
      return result.rows[0] ?? null;
    });
    if (!result) {
      return null;
    }
    return new User(
      result.loginid,
      result.fname,
      result.lname,
      result.username,
      result.email,
      result.tel_no,
      result.first_join,
      result.access_field,
      result.residence,
      result.address,
      result.birthday,
      result.gender,
      null
    );
  }

  //need checking
  async updateUserSubtle(loginid, changes) {
    //construct the statement on the fly
    let updates = "";
    let params = [loginid];
    const map = {
      loginid: "loginid",
      firstname: "fname",
      lastname: "lname",
      username: "username",
      email: "email",
      tel_no: "tel_no",
      first_join: "first_join",
      access_level: "access_field",
      residence: "residence",
      address: "address",
      birthday: "birthday",
      gender: "gender",
      password: "pwd",
    };
    let i = 2;
    for (const key of Object.keys(changes)) {
      updates += ` ${map[key]}=$${i++} ,`;
      const value = changes[key];
      params.push(value === IDatabase.DELETED ? null : value);
    }
    await this.#doConnected(async function (client) {
      const query = `UPDATE premier.user_details
        SET ${updates.slice(0, -1)}
        WHERE loginid = $1`;
      await client.query(query, params);
    });
  }

  async recordAccessToken(token, loginid) {
    await this.#doConnected(async function (client) {
      await client.query(
        `INSERT INTO premier.authentication_access_tokens(access_token,loginid) VALUES ($1,$2)`,
        [token, loginid]
      );
    });
  }

  async touchAccessToken(token) {
    let loginid = await this.#doConnected(async function (client) {
      let result = await client.query(
        "UPDATE premier.authentication_access_tokens SET expiry=DEFAULT WHERE access_token=$1 RETURNING loginid",
        [token]
      );
      return result.rows[0]?.loginid ?? null;
    });
    return loginid;
  }

  async revokeAccessToken(token) {
    let deleted = await this.#doConnected(async function (client) {
      let result = await client.query(
        "DELETE FROM premier.authentication_access_tokens WHERE access_token=$1",
        [token]
      );
      return result.rowCount > 0;
    });
    return deleted ?? false;
  }

  async getUserSecureWord(id) {
    return await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT secure_word FROM premier.user_details
        WHERE username = $1 OR email = $1`,
        [id]
      );
      return result.rows[0]?.secure_word ?? null;
    });
  }

  async getCategories() {
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(`SELECT * FROM premier.category`);
      return result.rows;
    });
    if (result == null) {
      return null;
    }
    let ret = {};
    for (const cat of result) {
      ret[cat.categoryid] = cat.category_name;
    }
    return ret;
  }

  async getProduct(product_id) {
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `
      WITH base AS (SELECT * FROM premier.product WHERE productid=$1)
      SELECT base.*,category_name FROM base INNER JOIN premier.category 
      USING (categoryid);
      `,
        [product_id]
      );
      return result.rows[0] ?? null;
    });
    if (!result) return null;
    //construct the thinf
    let ret = new Product(
      result.productid,
      result.product_name,
      result.description,
      result.stock,
      result.price,
      result.category_name,
      result.image
    );
    return ret;
  }

  async getProducts(search, offset = 0, limit = 50, randomize = false) {
    let params = [offset, limit];
    if (search) params.push(`%${search}%`);
    return await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT productid FROM premier.product
        WHERE (stock >0 or stock =-1) ${
          search ? "  AND product_name LIKE $3  " : ""
        }
        ${randomize ? " ORDER BY RANDOM() " : ""}
        OFFSET $1
        LIMIT $2`,
        params
      );
      return result.rows.map((z) => z.productid);
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
    return await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT productid FROM premier.product
        WHERE categoryid=(SELECT categoryid FROM premier.category WHERE category_name=$1)
          AND (stock > 0 or stock =-1) ${
            search ? " AND product_name like $4 " : ""
          }
          ${randomize ? " ORDER BY RANDOM() " : ""}
        OFFSET $2
        LIMIT $3`,
        params
      );
      return result.rows.map((z) => z.productid);
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

  // eslint-disable-next-line no-unused-vars
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
          WHERE o.orderid = t.orderid)`,
        [loginid]
      );
      return result.rows[0] ?? null;
    });
  }

  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  async updateTransactionSubtle(txid, changes) {}
}

module.exports = PostgresDatabase;
