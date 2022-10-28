/**
 * Interface for the database adapter to the rest of the application
 */

const User = require("../models/user");

class IDatabase {
  constructor() {}
  /////////////////////////////////////////////////////////////
  //    DATABASE ENGINE
  /////////////////////////////////////////////////////////////
  /**
   * Initialize the database engine
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error("Unimplemented");
  }
  /**
   * Shutdown the database engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    throw new Error("Unimplemented");
  }
  /////////////////////////////////////////////////////////////
  //    USERS
  /////////////////////////////////////////////////////////////
  /**
   * Request the password hash of the given user email
   * @param {string} email
   * @returns {Promise<{loginid:number,hash:string}|null>}
   */
  async obtainUserPasswordHash(email) {
    throw new Error("Unimplemented");
  }
  /**
   * Get the user information given the id
   * @param {number} loginid
   * @returns {Promise<User|null>}
   */
  async getUser(loginid) {
    throw new Error("Unimplemented");
  }
  /**
   * Record an access token to the system (Establish a login session)
   * @param {string} token
   * @param {number} loginid
   */
  async recordAccessToken(token, loginid) {
    throw new Error("Unimplemented");
  }
  /**
   * Check weather the token is valid and return its loginid
   * @param {string} token
   * @returns {Promise<number|null>} the loginid or the token is invalid
   */
  async touchAccessToken(token) {
    throw new Error("Unimplemented");
  }
  /**
   * Revoke the token
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async touchAccessToken(token) {
    throw new Error("Unimplemented");
  }
  /////////////////////////////////////////////////////////////
  //    PRODUCTS
  /////////////////////////////////////////////////////////////
  /**
   * Get the categories
   * @returns {Promise<{[key:number]:string}>}
   */
  async getCategories() {
    throw new Error("Unimplemented");
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
    throw new Error("Unimplemented");
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
    throw new Error("Unimplemented");
  }
  ///TODO: add transaction and models
}

module.exports = IDatabase;
