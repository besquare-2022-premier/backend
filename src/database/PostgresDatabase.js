const IDatabase = require("./IDatabase");
// eslint-disable-next-line no-unused-vars
const { Pool, Client } = require("pg");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const OutOfStockError = require("../types/OutOfStockError");

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
      idleTimeoutMillis: 30000,
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

  async updateUserSubtle(loginid, changes) {
    //construct the statement on the fly
    let updates = "";
    let params = [loginid];
    const map = {
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
    if (updates.length === 0) return;
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

  async isPhoneNumberUsed(number) {
    return await this.#doConnected(async function (client) {
      return (
        (
          await client.query(
            "SELECT loginid FROM premier.user_details WHERE tel_no=$1",
            [number]
          )
        ).rows.length != 0
      );
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
  #constructProductFromRow(row) {
    return new Product(
      row.productid,
      row.product_name,
      row.description,
      row.stock,
      row.price,
      row.category_name,
      row.image
    );
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
    return this.#constructProductFromRow(result);
  }
  async getProductMulti(product_ids) {
    if (product_ids.length === 0) {
      return [];
    }
    let sanitized_ids = product_ids.map((z) => z | 0);
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `
      WITH base AS (SELECT * FROM premier.product WHERE productid IN (${sanitized_ids.join(
        ","
      )}))
      SELECT base.*,category_name FROM base INNER JOIN premier.category 
      USING (categoryid);
      `
      );
      return result.rows ?? null;
    });
    if (!result) return null;
    //remap the result rows to the original order specified in params
    let ret = Array(product_ids.length).fill(null);
    for (const row of result) {
      let entry = this.#constructProductFromRow(row);
      ret[product_ids.indexOf(entry.product_id)] = entry;
    }
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
  /**
   * Construct the order from the row data
   * @param {any} data
   * @returns {Order}
   */
  #constructOrderFromRow(data) {
    return new Order(
      data.orderid,
      data.loginid,
      data.ship_address,
      data.country,
      []
    );
  }
  async getOrdersOfUser(loginid) {
    const self = this;
    return await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * from premier.orders
        WHERE loginid = $1`,
        [loginid]
      );
      return result.rows.map((z) => self.#constructOrderFromRow(z)) ?? null;
    });
  }

  async getUserOrder(loginid, orderid) {
    let result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.orders
        WHERE loginid = $1 AND orderid = $2`,
        [loginid, orderid]
      );
      return result.rows[0] ?? null;
    });
    if (result) {
      let ret = this.#constructOrderFromRow(result);
      await this._expandOrderDetails(ret);
      return ret;
    } else {
      return null;
    }
  }

  async _expandOrderDetails(order) {
    let query_result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT productid as product_id, quantity, price
        FROM premier.order_details where orderid=$1`,
        [order.orderid]
      );
      return result.rows;
    });
    if (query_result) {
      order.items = query_result;
    } else {
      throw new Error("Query failed");
    }
  }

  async getUserCart(loginid) {
    let return_val = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT o.* FROM premier.orders AS o
        WHERE o.loginid = $1 AND NOT EXISTS
        (SELECT t.orderid FROM premier.transaction AS t
          WHERE o.orderid = t.orderid);`,
        [loginid]
      );
      return result.rows;
    });
    //check the value first
    if (return_val.length === 0) {
      //there is nothing then create a new order for cart
      let ret = await this.#doConnected(async function (client) {
        let data = await client.query(
          `INSERT INTO premier.orders 
        (loginid,ship_address,country)
        VALUES ($1,'','') RETURNING *`,
          [loginid]
        );
        return data.rows;
      });
      return this.#constructOrderFromRow(ret[0]);
    } else {
      let ret = this.#constructOrderFromRow(return_val[0]);
      await this._expandOrderDetails(ret);
      return ret;
    }
  }

  async updateOrderSubtle(orderid, changes) {
    //construct the statement on the fly
    let updates = "";
    let params = [orderid];
    const map = {
      shipping_address: "ship_address",
      country: "ship_address",
    };
    let details_change = {};
    let i = 2;
    for (const key of Object.keys(changes)) {
      if ((key | 0) == key) {
        details_change[key] = changes[key];
        continue;
      }
      updates += ` ${map[key]}=$${i++} ,`;
      const value = changes[key];
      params.push(value === IDatabase.DELETED ? null : value);
    }
    let succeeded = await this.#doConnected(async function (client) {
      //process the changes in a transaction
      await client.query("BEGIN;");
      try {
        const query = `UPDATE premier.orders
        SET ${updates.slice(0, -1)}
        WHERE orderid = $1`;
        if (updates.length > 0) {
          await client.query(query, params);
        }
        for (const key of Object.keys(details_change)) {
          const val = details_change[key];
          if (val === IDatabase.DELETED) {
            await client.query(
              `DELETE FROM premier.order_details
           WHERE orderid=$1 AND productid=$2;`,
              [orderid, key]
            );
          } else {
            await client.query(
              `INSERT INTO premier.order_details 
           VALUES ($1,$2,$3,1) ON CONFLICT (orderid,productid) DO UPDATE SET quantity=excluded.quantity;`,
              [orderid, key, val]
            );
          }
          await client.query("COMMIT");
          return true;
        }
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
    if (!succeeded) throw new Error("Cannot process the modification");
  }

  /**
   * Commit the cart
   * @param {number} loginid
   * @returns {Promise<Transaction>}
   */
  async commitUserCart(loginid) {
    const self = this;
    //try to get the order id
    return await this.#doConnected(async function (client) {
      await client.query("BEGIN");
      try {
        //lock the table
        await client.query(
          "LOCK TABLE premier.product,premier.orders IN SHARE ROW EXCLUSIVE MODE"
        );
        let cart_info = (
          await client.query(
            `SELECT o.orderid FROM premier.orders AS o
        WHERE o.loginid = $1 AND NOT EXISTS
        (SELECT t.orderid FROM premier.transaction AS t
          WHERE o.orderid = t.orderid) FOR UPDATE;`,
            [loginid]
          )
        ).rows[0];
        if (!cart_info) {
          throw new Error("Cannot get order id for the cart");
        }
        //get all items in the cart and synchronize all the prices
        let items = (
          await client.query(
            `WITH prices AS (
          SELECT productid ,price 
          FROM premier.product 
          WHERE productid IN (SELECT productid FROM premier.order_details WHERE orderid=$1)
          FOR UPDATE)
          UPDATE premier.order_details AS od 
        SET price=pd.price FROM prices as pd WHERE orderid=$1 AND pd.productid=od.productid RETURNING *`,
            [cart_info.orderid]
          )
        ).rows;
        //get the quantities of the product
        let quantities_arr = (
          await client.query(`
              SELECT productid,stock FROM
              premier.product WHERE productid IN (${items
                .map((z) => z.productid | 0)
                .join(",")})
              FOR UPDATE
        `)
        ).rows;
        let quantities = {};
        for (const entry of quantities_arr) {
          quantities[entry.productid] = entry.stock;
        }
        let sum = 0;
        //check weather the product is enough
        for (const entry of items) {
          if (
            quantities[entry.productid] != -1 &&
            quantities[entry.productid] < entry.quantity
          ) {
            throw new OutOfStockError(
              "No enough stock for the product id=" + entry.productid
            );
          }
          sum += entry.quantity * entry.price;
        }
        //pre-commit the transaction
        await client.query(
          `with counts as (
          SELECT * FROM premier.order_details WHERE orderid=$1
          ) UPDATE premier.product SET stock=stock-counts.quantity
          FROM counts WHERE counts.productid=product.productid AND stock != -1`,
          [cart_info.orderid]
        );
        //create the transaction now
        let tx = await client.query(
          `
            INSERT INTO premier.transaction (orderid,loginid,amount)
            VALUES ($1,$2,$3) RETURNING *;
        `,
          [cart_info.orderid, loginid, sum]
        );
        //we are done commit it then
        await client.query("COMMIT");
        return self.#constructTransactionFromRow(tx.rows[0]);
      } catch (e) {
        await client.query("ROLLBACK");
        console.log(e);
        throw e;
      }
    });
  }
  /**
   * Revert the effect of the commitUserCart on an order
   * @param {number} orderid
   * @returns {Promise<true>}
   */
  async revertTransaction(orderid) {
    //try to get the order id
    return await this.#doConnected(async function (client) {
      await client.query("BEGIN");
      try {
        //lock the table
        await client.query(
          "LOCK TABLE premier.product,premier.orders IN SHARE ROW EXCLUSIVE MODE"
        );
        //get all items in the cart
        let items = (
          await client.query(
            `SELECT od.* from premier.order_details AS od WHERE od.orderid=$1;`,
            [orderid]
          )
        ).rows;
        //lock the rows out
        await client.query(`
              SELECT productid,stock FROM
              premier.product WHERE productid IN (${items
                .map((z) => z.productid | 0)
                .join(",")})
              FOR UPDATE
        `);
        //credit back the products where is not -1 (unlimited)
        await client.query(
          `with counts as (
          SELECT * FROM premier.order_details WHERE orderid=$1
          ) UPDATE premier.product SET stock=stock+counts.quantity
          FROM counts WHERE counts.productid=product.productid AND stock != -1`,
          [orderid]
        );
        //we are done commit it then
        await client.query("COMMIT");
        return true;
      } catch (e) {
        await client.query("ROLLBACK");
        console.log(e);
        throw e;
      }
    });
  }
  #constructTransactionFromRow(row) {
    return new Transaction(
      row.transactionid,
      row.orderid,
      row.loginid,
      row.amount | 0,
      row.payment_method,
      Transaction.Status[row.tx_status.toUpperCase()],
      row.tx_time,
      row.tx_settle_time,
      row.tx_reference
    );
  }
  async getTransaction(loginid, txid) {
    let query_result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.transaction
        WHERE loginid = $1 AND transactionid = $2`,
        [loginid, txid]
      );
      return result.rows[0] ?? null;
    });
    if (!query_result) {
      return null;
    }
    return this.#constructTransactionFromRow(query_result);
  }

  async searchTransactionForOrder(loginid, orderid) {
    let query_result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.transaction
        WHERE loginid = $1 AND orderid = $2`,
        [loginid, orderid]
      );
      return result.rows[0] ?? null;
    });
    if (!query_result) {
      return null;
    }
    return this.#constructTransactionFromRow(query_result);
  }

  async searchTransactionForReference(method, reference) {
    let query_result = await this.#doConnected(async function (client) {
      let result = await client.query(
        `SELECT * FROM premier.transaction
        WHERE payment_method = $1 AND tx_reference = $2`,
        [method, reference]
      );
      return result.rows[0] ?? null;
    });
    if (!query_result) {
      return null;
    }
    return this.#constructTransactionFromRow(query_result);
  }

  async updateTransactionSubtle(txid, changes) {
    //construct the statement on the fly
    let updates = "";
    let params = [txid];
    const map = {
      amount: "amount",
      payment_method: "payment_method",
      tx_status: "tx_status",
      tx_settle_time: "tx_settle_time",
    };
    let i = 2;
    for (const key of Object.keys(changes)) {
      updates += ` ${map[key]}=$${i++} ,`;
      const value =
        key === "tx_status"
          ? changes[key].description.toLowerCase()
          : changes[key];
      params.push(value === IDatabase.DELETED ? null : value);
    }
    if (updates.length === 0) return;
    await this.#doConnected(async function (client) {
      const query = `UPDATE premier.transaction
        SET ${updates.slice(0, -1)}
        WHERE transactionid = $1`;
      await client.query(query, params);
    });
  }
}

module.exports = PostgresDatabase;
