const express = require("express");
const { sendJsonResponse } = require("../endpoints/common_utils");
const { INVALID_ACCESS_TOKEN } = require("../types/error_codes");
/**
 * Middleware to enforce the authentication requirement
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
async function AuthenticatedEndpointMiddleware(req, res, next) {
  if (!req.user) {
    sendJsonResponse(
      res,
      403,
      new ResponseBase(INVALID_ACCESS_TOKEN, "Unauthenticated request")
    );
    return;
  }
  next();
}
module.exports = AuthenticatedEndpointMiddleware;
