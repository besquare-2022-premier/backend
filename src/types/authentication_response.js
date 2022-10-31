const { NO_ERROR } = require("./error_codes");
const ResponseBase = require("./response_base");

/**
 * Response to send when the user is authenticated
 */
class AuthenticationResponse extends ResponseBase {
  /**
   * @param {string} token
   */
  constructor(token) {
    super(NO_ERROR, "OK");
    this.token = token;
  }
}

module.exports = AuthenticationResponse;
