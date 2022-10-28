/**
 * The statuses for the transaction
 */
const TransactionStatus = Object.freeze({
  /**
   * The transaction is just created
   */
  CREATED: Symbol("CREATED"),
  /**
   * The transaction processing is finalized with success
   */
  SUCCEEDED: Symbol("SUCCEEDED"),
  /**
   * The transaction processing  is failed
   */
  FAILED: Symbol("FAILED"),
  /**
   * Tx failed
   */
  CANCELLED: Symbol("CANCELLED"),
});

class Transaction {
  /**
   *
   * @param {number} tx_id
   * @param {number} orderid
   * @param {number} loginid
   * @param {number} amount
   * @param {string?} payment_method
   * @param {TransactionStatus} tx_status
   * @param {Date} tx_time
   * @param {Date} tx_settled
   */
  constructor(
    tx_id,
    orderid,
    loginid,
    amount,
    payment_method,
    tx_status,
    tx_time,
    tx_settled
  ) {
    this.tx_id = tx_id;
    this.orderid = orderid;
    this.loginid = loginid;
    this.amount = amount;
    this.payment_method = payment_method;
    this.tx_status = tx_status;
    this.tx_time = tx_time;
    this.tx_settled = tx_settled;
  }
}
/**
 * Transaction status
 */
Transaction.Status = TransactionStatus;

module.exports = Transaction;
