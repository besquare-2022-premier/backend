const express = require("express");
const { verifyToken } = require("../authentication/csrf");
const { sendJsonResponse } = require("../endpoints/common_utils");
const { INVALID_CRSF_TOKEN } = require("../types/error_codes");
/**
 * Middleware to deal with the CSRF
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function CSRFProtectedMiddleware(req, res, next) {
  let token;
  if (!(token = req.get("X-CSRF-Token"))) {
    sendJsonResponse(
      res,
      403,
      new ResponseBase(INVALID_CRSF_TOKEN, "No CSRF token for the request")
    );
    return;
  }
  //detect the request type
  let validation = false;
  if (req.user) {
    validation = verifyToken(token, req.access_token, "access");
  } else {
    validation = verifyToken(token, req.session_id, "session");
  }
  if (!validation) {
    sendJsonResponse(
      res,
      403,
      new ResponseBase(INVALID_CRSF_TOKEN, "Invalid CSRF token for the request")
    );
    return;
  }
  next();
}

module.exports = CSRFProtectedMiddleware;
