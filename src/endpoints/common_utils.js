const { UNPROCESSABLE_ENTITY } = require("../types/error_codes");
const ResponseBase = require("../types/response_base");

/**
 * A simple wrapper around promise function so the exception do not kill the server
 * @param {import("express").RequestHandler} handler
 */
function asyncExpressHandler(handler) {
  return function (req, res, next) {
    //call the function and pass the exception to the next
    handler(req, res, next)?.catch?.(next);
  };
}
/**
 * Send a JSON response and end the request processing
 * @param {import("express").Response} res
 * @param {number} status
 * @param {any} payload
 */
function sendJsonResponse(res, status, payload) {
  res.status(status).json(payload).end();
}
/**
 * assert the request is a json request, this function will terminate the processing
 * of the request when it is not
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {boolean} should the endpoint process the request
 */
function assertJsonRequest(req, res) {
  if (!req.is("json")) {
    sendJsonResponse(
      res,
      400,
      new ResponseBase(
        UNPROCESSABLE_ENTITY,
        "Cannot process the request, not a JSON payload!"
      )
    );
    return false;
  }
  return true;
}
/**
 * Test the input string weather it is a valid email
 * @param {string} email
 * @returns {boolean}
 */
function validEmail(email) {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email);
}
function validPassword(password) {
  return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%^&*()=+-/.]).{8,}/.test(
    password
  );
}
module.exports = {
  asyncExpressHandler,
  assertJsonRequest,
  validEmail,
  sendJsonResponse,
  validPassword,
};
