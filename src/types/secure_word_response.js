const { NO_ERROR } = require("./error_codes");
const ResponseBase = require("./response_base");

/**
 * Response to send when the user is authenticated
 */
class SecureWordResponse extends ResponseBase {
  /**
   * @param {string} secure_word
   */
  constructor(secure_word) {
    super(NO_ERROR, "OK");
    this.secure_word = secure_word;
  }
}

module.exports = SecureWordResponse;
