// eslint-disable-next-line no-unused-vars
const express = require("express");
const { sendJsonResponse } = require("../endpoints/common_utils");
const { INVALID_ACCESS_TOKEN } = require("../types/error_codes");
const ResponseBase = require("../types/response_base");
/**
 * Middleware to enforce the authentication requirement
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function AuthenticatedEndpointMiddleware(req, res, next) {
  if (!req.user) {
    sendJsonResponse(
      res,
      401,
      new ResponseBase(INVALID_ACCESS_TOKEN, "Unauthenticated request")
    );
    return;
  }
  next();
}
module.exports = AuthenticatedEndpointMiddleware;
