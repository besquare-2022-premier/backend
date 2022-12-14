/* eslint no-unused-vars: 0 */
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const User = require("../models/user");
const Product = require("../models/product");
const Review = require("../models/review");
const CommunityMessage = require("../models/community_message");

/**
 * Interface for the database adapter to the rest of the application
 */
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
   * Add a verification code for email
   * @param {string} email
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  async addVerificationCode(email, code) {
    throw new Error("Unimplemented");
  }
  /**
   * Verify and get the email address associated to it
   * @param {string} code
   * @returns {Promise<string|null>}
   */
  async verifyVerificationCode(code) {
    throw new Error("Unimplemented");
  }
  /**
   * @param {string} code
   * @returns {Promise<void>}
   */
  async voidVerificationCode(code) {
    throw new Error("Unimplemented");
  }
  /**
   * Request the password hash of the given user email
   * @param {string|number} id email or username or loginid
   * @returns {Promise<{loginid:number,hash:string}|null>}
   */
  async obtainUserPasswordHash(id) {
    throw new Error("Unimplemented");
  }
  /**
   * Create an user in the database
   * @param {User} user user to create, the final user id is returned in the object
   * @param {string} password user password hash
   * @returns {Promise<boolean>}
   */
  async addUser(user, password) {
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
   * A function for the database to apply the update without needing to compare the values
   * @param {number} loginid
   * @param {{[key:any]:any}} changes
   */
  async updateUserSubtle(loginid, changes) {
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
  async revokeAccessToken(token) {
    throw new Error("Unimplemented");
  }
  /**
   * Get secure word for user
   * @param {string} id email or username
   * @returns {Promise<string|null>}
   */
  async getUserSecureWord(id) {
    throw new Error("Unimplemented");
  }
  /**
   * Query the system weather the phone number is registered
   * @param {string} number
   * @returns {Promise<boolean>}
   */
  async isPhoneNumberUsed(number) {
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
  /**
   * Get the product
   * @param {number} product_id
   * @param {boolean} bypass_cache
   * @returns {Promise<Product|null>}
   */
  async getProduct(product_id, bypass_cache = false) {
    throw new Error("Unimplemented");
  }
  /**
   * Get the products
   * @param {number[]} product_ids
   * @param {boolean} bypass_cache
   * @returns {Promise<(Product|null)[]>}
   */
  async getProductMulti(product_ids, bypass_cache = false) {
    throw new Error("Unimplemented");
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
    throw new Error("Unimplemented");
  }
  /**
   * Get the specific order of the user, the order details are expanded in this call
   * @param {number} loginid
   * @param {number} orderid
   * @returns {Promise<Order>}
   */
  async getUserOrder(loginid, orderid) {
    throw new Error("Unimplemented");
  }
  /**
   * Attempt to expand the order details. Not meant to be used directly
   * @param {Order} order
   * @returns {Promise<boolean>}
   */
  async _expandOrderDetails(order) {
    throw new Error("Unimplemented");
  }
  /**
   * Get current cart of user, details are expanded in this call
   * @param {number} loginid
   * @returns {Promise<Order>}
   */
  async getUserCart(loginid) {
    throw new Error("Unimplemented");
  }
  /**
   * Commit the cart
   * @param {number} loginid
   * @returns {Promise<Transaction>}
   */
  async commitUserCart(loginid) {
    throw new Error("Unimplemented");
  }
  /**
   * Revert the effect of the commitUserCart on an order
   * @param {number} loginid
   * @param {number} orderid
   * @returns {Promise<true>}
   */
  async revertTransaction(loginid, orderid) {
    throw new Error("Unimplemented");
  }
  /**
   * A function for the database to apply the update without needing to compare the values
   * @param {number} loginid
   * @param {number} orderid
   * @param {{[key:any]:any}} changes
   */
  async updateOrderSubtle(loginid, orderid, changes) {
    throw new Error("Unimplemented");
  }
  /////////////////////////////////////////////////////////////
  //    TRANSACTION
  /////////////////////////////////////////////////////////////
  /**
   * Get the specified transaction
   * @param {number} loginid
   * @param {number} txid
   * @returns {Promise<Transaction|null>}
   */
  async getTransaction(loginid, txid) {
    throw new Error("Unimplemented");
  }
  /**
   * Search the transaction ID for the given orderid
   * @param {number} loginid
   * @param {number} orderid
   * @returns {Promise<Transaction|null>}
   */
  async searchTransactionForOrder(loginid, orderid) {
    throw new Error("Unimplemented");
  }
  /**
   * Search a transaction using the reference code issued by the payment method
   * @param {string} method
   * @param {string} reference
   * @returns {Promise<Transaction|null>}
   */
  async searchTransactionForReference(method, reference) {
    throw new Error("Unimplemented");
  }
  /**
   * A function for the database to apply the update without needing to compare the values
   * @param {number} txid
   * @param {{[key:any]:any}} changes
   */
  async updateTransactionSubtle(txid, changes) {
    throw new Error("Unimplemented");
  }
  /**
   * Get the reviews of a product with productid
   * @param {number} productid
   * @returns {Promise<Review[]>}
   */
  async getProductReviews(productid) {
    throw new Error("Unimplemented");
  }
  /**
   * Add review
   * @param {Review} review
   */
  async addReview(review) {
    throw new Error("Unimplemented");
  }
  /**
   * Get all the community topics which supported by the system
   * @returns {Promise<string[]>}
   */
  async getCommunityTopics() {
    throw new Error("Unimplemented");
  }
  /**
   * Get the community messages which belonging to the topic
   * @param {string} topic The topic which the messages should be obtained
   * @param {number} offset
   * @param {number} limit
   * @returns {Promise<CommunityMessage[]>}
   */
  async getCommunityMessageForTopic(topic, offset = 0, limit = 50) {
    throw new Error("Unimplemented");
  }
  /**
   * Get the replies for the message
   * @param {number} message_id The id of the message that its replies should be obtained
   * @param {number} offset
   * @param {number} limit
   * @returns {Promise<CommunityMessage[]>}
   */
  async getCommunityRepliesForMessage(message_id, offset = 0, limit = 50) {
    throw new Error("Unimplemented");
  }
  /**
   * Add a message into the database
   * @param {CommunityMessage} message The message to be added
   * @returns {Promise<true>}
   */
  async addCommunityMessage(message) {
    throw new Error("Unimplemented");
  }
  /**
   * Get the community message
   * @param {number} message_id
   * @returns {Promise<CommunityMessage|null>}
   */
  async getCommunityMessage(message_id) {
    throw new Error("Unimplemented");
  }
  /**
   * Check weather the topic is exists
   * @param {string} topic
   * @returns {Promise<boolean>}
   */
  async isCommunityTopicExists(topic) {
    throw new Error("Unimplemented");
  }
}
/**
 * Field that is removed
 */
IDatabase.DELETED = Symbol("DELETED");
module.exports = IDatabase;
