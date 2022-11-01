/**
 * CSRF endpoints which are mounted under `/api/v1/auth`
 */
const express = require("express");
const rate_limiter = require("express-rate-limit");
const { createToken } = require("../authentication/csrf");
const { RATE_LIMIT_EXCEEDED } = require("../types/error_codes");
const { asyncExpressHandler, sendJsonResponse } = require("./common_utils");
const ResponseBase = require("../types/response_base");

const app = express.Router();
app.use(
  rate_limiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: new ResponseBase(
      RATE_LIMIT_EXCEEDED,
      "The rate limit is exceeded"
    ),
  })
);
app.get(
  "/",
  asyncExpressHandler(async function (req, res) {
    if (req.user) {
      //request is authenticated then generate a token bound under the access token
      sendJsonResponse(res, 200, await createToken(req.access_token, "access"));
    } else {
      //otherwise try use session id
      sendJsonResponse(res, 200, await createToken(req.session_id, "session"));
    }
  })
);
module.exports = app;
