const PostgresDatabase = require("./PostgresDatabase");
const REDIS = require("../redis/RedisStore");
const token_validity = 3600;
const general_validity = 360;
const redisKeyUser = (k) => `user$$$${k}`;
const redisKeyReview = (k) => `review$$$${k}`;
const redisKeyAccessToken = (k) => `access_token$$$${k}`;
const redisKeyUserOrder = (k) => `user_order$$$${k}`;
const redisKeyUserCart = (k) => `user_cart$$$${k}`;
const redisKeyProductId = (k) => `product$$$${k}`;
class RedisCachedDatabase extends PostgresDatabase {
  constructor() {
    super();
  }
  /////////////////////////////////////////////////////////////
  //    DATABASE ENGINE
  /////////////////////////////////////////////////////////////
  /**
   * Shutdown the database engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    await REDIS.connector.quit();
    await super.shutdown();
  }
  /////////////////////////////////////////////////////////////
  //    USERS
  /////////////////////////////////////////////////////////////
  /**
   * Get the user information given the id
   * @param {number} loginid
   * @returns {Promise<User|null>}
   */
  async getUser(loginid) {
    return await REDIS.getOrSet(
      redisKeyUser(loginid),
      () => super.getUser(loginid),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * A function for the database to apply the update without needing to compare the values
   * @param {number} loginid
   * @param {{[key:any]:any}} changes
   */
  async updateUserSubtle(loginid, changes) {
    await Promise.all([
      super.updateUserSubtle(loginid, changes),
      REDIS.invalidate(redisKeyUser(loginid)),
    ]);
  }
  /**
   * Record an access token to the system (Establish a login session)
   * @param {string} token
   * @param {number} loginid
   */
  async recordAccessToken(token, loginid) {
    await Promise.race([
      super.recordAccessToken(token, loginid),
      REDIS.set(redisKeyAccessToken(token), loginid, token_validity),
    ]);
  }
  /**
   * Check weather the token is valid and return its loginid
   * @param {string} token
   * @returns {Promise<number|null>} the loginid or the token is invalid
   */
  async touchAccessToken(token) {
    let exists = await REDIS.expire(redisKeyAccessToken(token), token_validity);
    if (!exists) {
      let loginid = await super.touchAccessToken(token);
      //let it finishes without messing up with the main flow
      REDIS.set(redisKeyAccessToken(token), loginid, token_validity);
      return loginid;
    } else {
      //use promise race mode as it yields to the same thing
      return await Promise.race([
        REDIS.getOrSet(redisKeyAccessToken(token)),
        super.touchAccessToken(token),
      ]);
    }
  }
  /**
   * Revoke the token
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async revokeAccessToken(token) {
    await Promise.all([
      REDIS.invalidate(redisKeyAccessToken(token)),
      super.revokeAccessToken(token),
    ]);
    return true;
  }
  /////////////////////////////////////////////////////////////
  //    PRODUCTS
  /////////////////////////////////////////////////////////////
  /**
   * Get the categories
   * @returns {Promise<{[key:number]:string}>}
   */
  async getCategories() {
    return await REDIS.getOrSet(
      "products$cats",
      () => super.getCategories(),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Get the product id, optionally with the search
   * @param {string?} search
   * @param {number} offset
   * @param {number} limit
   * @param {boolean} randomize
   * @returns {Promise<number[]>}
   */
  async getProducts(search, offset = 0, limit = 50, randomize = false) {
    if (randomize) {
      return await super.getProducts(search, offset, limit, randomize);
    }
    return await REDIS.getOrSet(
      `products$q$${search}$${offset}$${limit}`,
      () => super.getProducts(search, offset, limit, randomize),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Get the product id under a category, optionally with the search
   * @param {string} category
   * @param {string?} search
   * @param {number} offset
   * @param {number} limit
   * @param {boolean} randomize
   * @returns {Promise<number[]>}
   */
  async getProductsByCategory(
    category,
    search,
    offset = 0,
    limit = 50,
    randomize = false
  ) {
    if (randomize) {
      return await super.getProductsByCategory(
        category,
        search,
        offset,
        limit,
        randomize
      );
    }
    return await REDIS.getOrSet(
      `products$${category}$q$${search}$${offset}$${limit}`,
      () =>
        super.getProductsByCategory(category, search, offset, limit, randomize),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Get the product
   * @param {number} product_id
   * @param {boolean} bypass_cache
   * @returns {Promise<Product|null>}
   */
  async getProduct(product_id, bypass_cache = false) {
    if (bypass_cache) {
      return await super.getProduct(product_id, true).then((z) => {
        REDIS.set(redisKeyProductId(product_id), z, general_validity);
        return z;
      });
    }
    return await REDIS.getOrSet(
      redisKeyProductId(product_id),
      () => super.getProduct(product_id, true),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Get the products
   * @param {number[]} product_ids
   * @param {boolean} bypass_cache
   * @returns {Promise<(Product|null)[]>}
   */
  async getProductMulti(product_ids, bypass_cache = false) {
    if (bypass_cache) {
      return super.getProductMulti(product_ids, bypass_cache).then((z) => {
        z.forEach((y, i) =>
          REDIS.set(redisKeyProductId(product_ids[i]), y, general_validity)
        );
        return z;
      });
    }
    const preattempt = await Promise.all(
      product_ids.map((z) => REDIS.getOrSet(redisKeyProductId(z)))
    );
    //find out the missings
    let unresolved = preattempt.filter((z) => !z).map((_, i) => product_ids[i]);
    let resolve = await super.getProductMulti(unresolved, true).then((y) =>
      y.map((z, i) => {
        REDIS.set(redisKeyProductId(unresolved[i]), z, general_validity);
        return z;
      })
    );
    //merge them up
    for (let i = 0; i < resolve.length; i++) {
      preattempt[product_ids.indexOf(unresolved[i])] = resolve[i];
    }
    return preattempt;
  }
  /////////////////////////////////////////////////////////////
  //    ORDERS
  /////////////////////////////////////////////////////////////
  /**
   * Get the orders of the user, the order details are not expanded in this call
   * @param {number} loginid
   * @returns {Promise<Order[]>}
   */
  async getOrdersOfUser(loginid) {
    return await REDIS.getOrSet(
      redisKeyUserOrder(loginid),
      () => super.getOrdersOfUser(loginid),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Get current cart of user, details are expanded in this call
   * @param {number} loginid
   * @returns {Promise<Order>}
   */
  async getUserCart(loginid) {
    return await REDIS.getOrSet(
      redisKeyUserCart(loginid),
      () => super.getUserCart(loginid),
      general_validity,
      general_validity / 2
    );
  }
  /**
   * Commit the cart
   * @param {number} loginid
   * @returns {Promise<Transaction>}
   */
  async commitUserCart(loginid) {
    let ret = await super.commitUserCart(loginid);
    await Promise.all([
      REDIS.invalidate(redisKeyUserCart(loginid)),
      REDIS.invalidate(redisKeyUserOrder(loginid)),
    ]);
    return ret;
  }
  /**
   * Revert the effect of the commitUserCart on an order
   * @param {number} loginid
   * @param {number} orderid
   * @returns {Promise<true>}
   */
  async revertTransaction(loginid, orderid) {
    await Promise.all([
      super.revertTransaction(loginid, orderid),
      REDIS.invalidate(redisKeyUserOrder(loginid)),
    ]);
    return true;
  }
  /**
   * A function for the database to apply the update without needing to compare the values
   * @param {number} orderid
   * @param {{[key:any]:any}} changes
   */
  async updateOrderSubtle(loginid, orderid, changes) {
    await Promise.all([
      super.updateOrderSubtle(loginid, orderid, changes),
      REDIS.invalidate(redisKeyUserOrder(loginid)),
    ]);
  }
  /**
   * Get the reviews of a product with productid
   * @param {number} productid
   * @returns {Promise<Review[]>}
   */
  async getProductReviews(productid) {
    return await REDIS.getOrSet(
      redisKeyReview(productid),
      () => super.getProductReviews(productid),
      general_validity / 2,
      general_validity
    );
  }
  /**
   * Add review
   * @param {Review} review
   */
  async addReview(review) {
    await Promise.all([
      super.addReview(review),
      REDIS.expire(redisKeyReview(productid), 10),
    ]);
  }
}
module.exports = RedisCachedDatabase;
