/* eslint no-unused-vars: 0 */

const Transaction = require("../models/transaction");

/**
 * Base class for the payment processor
 */
class IPaymentProcessor {
  constructor() {}
  /**
   * Create a new payment session
   * @param {number} txid
   * @param {number} loginid
   * @param {number} amount
   * @returns {Promise<{session_id:string,url:string}>}
   */
  async createNewSession(txid, loginid, amount) {
    throw new Error("Unimplemented");
  }
  /**
   * Query the current status of the session
   * @param {number} session_id
   * @returns {(Transaction.Status)}
   */
  async querySessionStatus(session_id) {
    throw new Error("Unimplemented");
  }
  /**
   * An optional function to be implemented when the transaction
   * is going to be marked as void
   * @param {string} session_id
   */
  async destroySession(session_id) {}
}
module.exports = IPaymentProcessor;
