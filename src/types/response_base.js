/**
 * Base type of all non-paginated responses
 */
class ResponseBase {
  /**
   * Construct a response
   * @param {number} status
   * @param {string} message
   */
  constructor(status = 0, message = "OK") {
    this.status = status;
    this.message = message;
  }
}
module.exports = ResponseBase;
